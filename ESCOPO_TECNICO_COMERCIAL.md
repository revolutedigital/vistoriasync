# Escopo Técnico Comercial - VistoriaSync

## Proposta para: Prates Vistorias
**Data:** Dezembro 2024

---

## Visão Geral do Sistema

O **VistoriaSync** é uma plataforma web completa para gestão de vistorias imobiliárias, integrando o sistema KSI com o sistema financeiro Flow, automatizando processos que hoje são manuais e reduzindo significativamente o tempo operacional e a inadimplência.

---

# MÓDULO 1: Conexão + Consulta de Vistorias

## Valor: R$ 30.000,00

### 1.1 Infraestrutura Base

| Componente | Descrição |
|------------|-----------|
| **Backend** | API REST com Node.js 20 LTS + Fastify + TypeScript |
| **Banco de Dados** | PostgreSQL 15+ com Prisma ORM |
| **Cache** | Redis 7+ para sessões e performance |
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Containerização** | Docker + Docker Compose |
| **Deploy** | Railway (produção) |

### 1.2 Sistema de Autenticação

- Login seguro com JWT (JSON Web Tokens)
- Controle de sessão com refresh tokens
- Níveis de acesso: Admin, Gerente, Operador
- Recuperação de senha por email
- Log de auditoria de acessos

### 1.3 Cadastros Básicos

#### Imobiliárias
- Nome, CNPJ, contatos (email, telefone, WhatsApp)
- Cidade de atuação
- Dia de vencimento das faturas
- Forma de pagamento preferencial (Boleto/PIX/Transferência)
- Mapeamento com nome do KSI (para importação automática)
- Status ativo/inativo

#### Vistoriadores
- Nome, CPF, contatos (email, telefone, WhatsApp)
- Cidade de atuação
- Chave PIX para pagamento
- Mapeamento com nome do KSI
- Status ativo/inativo

#### Tipos de Serviço
- Código do serviço (ex: 1.0, 2.1, 3.0)
- Nome (ex: Vistoria de Entrada, Vistoria de Saída)
- Descrição detalhada
- Status ativo/inativo

#### Faixas de Metragem
| Faixa | Metros Min | Metros Max | Multiplicador |
|-------|------------|------------|---------------|
| 1 | 0 | 150 | 1.0x |
| 2 | 151 | 225 | 1.5x |
| 3 | 226 | 300 | 2.0x |
| 4 | 301 | 375 | 2.5x |
| 5 | 376 | 450 | 3.0x |
| 6 | 451 | 525 | 3.5x |
| 7 | 526 | 600 | 4.0x |
| 8 | 601+ | ∞ | 5.0x |

### 1.4 Tabelas de Preços Configuráveis

#### Tabela de Preços por Imobiliária
- Matriz: **Imobiliária × Tipo Serviço × Faixa Metragem**
- Valor base do serviço
- Adicional para imóvel mobiliado
- Adicional para imóvel semi-mobiliado
- Edição individual ou em massa
- Histórico de alterações

#### Tabela de Pagamentos por Vistoriador
- Matriz: **Vistoriador × Tipo Serviço × Faixa Metragem**
- Valor base do pagamento
- Adicional para imóvel mobiliado
- Adicional para imóvel semi-mobiliado

### 1.5 Importação de Dados do KSI

#### Upload de Planilha Excel
- Importação do arquivo Excel exportado do KSI
- Validação automática da estrutura do arquivo
- Processamento em background (não trava a interface)
- Barra de progresso em tempo real

#### Mapeamento Automático de Colunas
| Coluna KSI | Campo Sistema |
|------------|---------------|
| id | ID Original KSI |
| N° Contrato | Número do Contrato |
| Cliente | Imobiliária (busca automática) |
| Vistoriadores | Vistoriador (busca automática) |
| Endereço | Endereço completo |
| Cidade | Cidade (extração automática) |
| Área Infor. | Área informada pela imobiliária |
| Área Aferida | Área medida pelo vistoriador |
| Área à Faturar | Área final para faturamento |
| Mobiliado | Tipo de mobília (Sim/Não/Semi) |
| Tipo Serviço | Tipo de serviço |
| Data Agenda | Data agendada |
| Data Finalizado | Data de conclusão |

#### Tratamento de Erros
- Identificação de imobiliárias não cadastradas
- Identificação de vistoriadores não cadastrados
- Relatório de linhas com erro
- Opção de cadastrar automaticamente novos registros

### 1.6 Sistema de Fechamentos Mensais

#### Ciclo de Vida do Fechamento
```
RASCUNHO → IMPORTADO → CALCULADO → AGUARDANDO_VISTORIADORES →
EM_REVISÃO → AGUARDANDO_IMOBILIÁRIAS → FATURADO → FINALIZADO
```

#### Funcionalidades
- Criar fechamento por mês/ano
- Importar planilha do KSI
- Visualizar todas as vistorias importadas
- Filtros por imobiliária, vistoriador, cidade, status
- Busca por endereço ou contrato
- Edição manual de vistorias (correções)

### 1.7 Cálculo Automático de Valores

#### Algoritmo de Cálculo
1. Identificar faixa de metragem pela área a faturar
2. Buscar valor base na tabela de preços da imobiliária
3. Aplicar multiplicador da faixa de metragem
4. Adicionar valor de mobília se aplicável
5. Calcular valor do vistoriador pela mesma lógica

#### Detalhamento do Cálculo
- Log detalhado de cada cálculo
- Possibilidade de recalcular individualmente
- Recálculo em massa do fechamento
- Preview antes de confirmar

### 1.8 Integração Automática com Flow (API)

#### Cadastro Automático de Contas a Receber (Imobiliárias)
- Integração direta via API do Flow
- Criação automática de lançamentos financeiros
- Dados enviados:
  - Cliente (Imobiliária)
  - Valor total calculado
  - Data de vencimento
  - Forma de pagamento
  - Descrição/Referência (mês/ano)
  - Centro de custo
  - Categoria financeira
- Sincronização de status (pago/pendente)
- Log de integração para auditoria

#### Cadastro Automático de Contas a Pagar (Vistoriadores)
- Integração direta via API do Flow
- Criação automática de lançamentos financeiros
- Dados enviados:
  - Fornecedor (Vistoriador)
  - CPF
  - Valor total calculado
  - Data de pagamento prevista
  - Chave PIX
  - Descrição/Referência (mês/ano)
  - Centro de custo
  - Categoria financeira
- Log de integração para auditoria

#### Exportação Excel (Backup/Conferência)
- Opção de exportar para Excel caso necessário
- Relatório de conferência antes do envio ao Flow
- Histórico de envios realizados

### 1.9 Dashboard Operacional

#### KPIs em Tempo Real
- Total de vistorias do mês
- Valor total a receber
- Valor total a pagar
- Margem bruta
- Comparativo com mês anterior

#### Gráficos
- Evolução mensal de vistorias
- Distribuição por cidade
- Distribuição por imobiliária
- Top 10 vistoriadores

### 1.10 Relatórios

- Relatório de vistorias por período
- Relatório de vistorias por imobiliária
- Relatório de vistorias por vistoriador
- Relatório de vistorias por cidade
- Exportação em Excel e PDF

---

## Custos Recorrentes - Módulo 1

| Item | Valor Mensal |
|------|--------------|
| **Hospedagem (Railway)** | R$ 1.000,00 |
| **Por usuário adicional** | R$ 30,00/usuário |

### Incluso no valor de hospedagem:
- Servidor de aplicação
- Banco de dados PostgreSQL
- Cache Redis
- SSL/HTTPS
- Backups diários automáticos
- Monitoramento 24/7
- Suporte técnico

---

# MÓDULO 2: Geração de Cobrança Automática

## Valor: R$ 25.000,00

### 2.1 Sistema de Contestações

#### Portal do Vistoriador
- Acesso via link único (sem necessidade de cadastro)
- Visualização de todas as vistorias do mês
- Resumo de valores
- Aprovação individual ou em massa
- Abertura de contestação

#### Tipos de Contestação
- Metragem incorreta
- Tipo de mobília incorreto
- Tipo de serviço incorreto
- Valor incorreto
- Outros

#### Fluxo de Contestação
```
VISTORIADOR CONTESTA → ADMIN RECEBE NOTIFICAÇÃO →
ADMIN ANALISA → ACEITA/RECUSA/PARCIAL →
VISTORIADOR RECEBE RESULTADO → RECÁLCULO (se aceita)
```

#### Gestão de Contestações
- Lista de contestações pendentes
- Filtros por vistoriador, tipo, status
- Resposta com justificativa
- Histórico de contestações

### 2.2 Integração com Gateway de Pagamento (Asaas)

#### Cadastro Automático de Clientes
- Sincronização de imobiliárias com Asaas
- Atualização automática de dados cadastrais
- Gestão de clientes duplicados

#### Geração de Cobranças
- Boleto bancário
- PIX com QR Code
- PIX Copia e Cola
- Definição automática de vencimento

#### Dados da Cobrança
- Valor calculado automaticamente
- Descrição detalhada (referência mês/ano)
- Link para segunda via
- Linha digitável do boleto

### 2.3 Gestão de Faturas

#### Ciclo de Vida da Fatura
```
PENDENTE → ENVIADA → PAGA / VENCIDA → CANCELADA
```

#### Funcionalidades
- Visualização tipo Kanban por status
- Filtros por período, imobiliária, status
- Envio manual de cobrança
- Segunda via de boleto
- Baixa manual de pagamento
- Cancelamento de fatura

### 2.4 Webhooks de Pagamento

#### Confirmação Automática
- Recebimento de notificação do Asaas
- Atualização automática do status
- Registro de data e valor pago
- Conciliação bancária automática

### 2.5 Sistema de Notificações WhatsApp

#### Notificações Automáticas

| Evento | Destinatário | Quando |
|--------|--------------|--------|
| Planilha pronta para revisão | Vistoriador | Ao enviar para revisão |
| Nova contestação recebida | Admin | Quando vistoriador contesta |
| Contestação resolvida | Vistoriador | Quando admin resolve |
| Fatura gerada | Imobiliária | Ao gerar cobrança |
| Lembrete de vencimento | Imobiliária | 3 dias antes |
| Fatura vencida | Imobiliária | No dia seguinte |
| Pagamento confirmado | Imobiliária | Ao confirmar pagamento |

#### Integração WhatsApp Business
- Envio via API (Evolution API ou similar)
- Templates personalizáveis
- Log de mensagens enviadas
- Retry automático em caso de falha

### 2.6 Gestão de Pagamentos a Vistoriadores

#### Controle de Pagamentos
- Lista de pagamentos pendentes por fechamento
- Filtros por vistoriador, status, período
- Marcação de pagamento realizado
- Upload de comprovante
- Relatório de pagamentos

### 2.7 Dashboard Financeiro

#### KPIs Financeiros
- Total faturado no mês
- Total recebido no mês
- Inadimplência atual
- Inadimplência > 30 dias
- Taxa de conversão (faturado vs recebido)

#### Gráficos Financeiros
- Evolução da inadimplência
- Recebimentos por forma de pagamento
- Aging de recebíveis
- Previsão de fluxo de caixa

### 2.8 Relatórios Financeiros

- Relatório de inadimplência
- Relatório de recebimentos
- Relatório de pagamentos a vistoriadores
- Conciliação financeira
- Exportação em Excel e PDF

### 2.9 Automações

#### Jobs Automáticos
- Envio de lembretes de vencimento (diário)
- Atualização de status de faturas vencidas (diário)
- Retry de notificações falhas (a cada hora)
- Backup automático (diário)

---

## Resumo Financeiro

### Investimento Inicial

| Módulo | Valor |
|--------|-------|
| **Módulo 1:** Conexão + Consulta de Vistorias | R$ 30.000,00 |
| **Módulo 2:** Geração de Cobrança Automática | R$ 25.000,00 |
| **TOTAL** | **R$ 55.000,00** |

### Custos Mensais

| Item | Valor |
|------|-------|
| Hospedagem e infraestrutura | R$ 1.000,00/mês |
| Usuários adicionais | R$ 30,00/usuário/mês |
| Taxa Asaas (Módulo 2) | Conforme tabela Asaas* |

*Taxas do Asaas são cobradas diretamente pelo gateway e variam conforme o tipo de cobrança (boleto, PIX, etc.)

---

## Benefícios Esperados

### Redução de Tempo
| Processo | Antes | Depois |
|----------|-------|--------|
| Fechamento mensal | 8-10 horas | < 2 horas |
| Cálculo de valores | 2-3 horas | Automático |
| Geração de cobranças | 3-4 horas | Automático |
| Envio de notificações | 2 horas | Automático |

### Redução de Erros
| Tipo | Antes | Depois |
|------|-------|--------|
| Erros de cálculo | ~5% | < 0.5% |
| Cobranças esquecidas | Frequente | Zero |
| Pagamentos não identificados | Comum | Automático |

### Redução de Inadimplência
| Métrica | Antes | Meta |
|---------|-------|------|
| Taxa de inadimplência | ~10% | < 3% |
| Inadimplência > 30 dias | Alta | Mínima |

---

## Condições de Pagamento

### Módulo 1 - R$ 30.000,00
- 50% na assinatura do contrato (R$ 15.000,00)
- 50% na entrega e homologação (R$ 15.000,00)

### Módulo 2 - R$ 25.000,00
- 50% no início do desenvolvimento (R$ 12.500,00)
- 50% na entrega e homologação (R$ 12.500,00)

### Custos Mensais
- Faturamento mensal
- Vencimento dia 10 do mês subsequente

---

## Prazo de Entrega

| Módulo | Prazo Estimado |
|--------|----------------|
| Módulo 1 | 4-6 semanas |
| Módulo 2 | 3-4 semanas (após Módulo 1) |
| **Total** | **7-10 semanas** |

---

## Garantia e Suporte

### Garantia
- 90 dias de garantia contra bugs após entrega
- Correções sem custo adicional

### Suporte Técnico
- Incluso no valor de hospedagem mensal
- Atendimento em horário comercial
- Tempo de resposta: até 24 horas
- Canais: Email e WhatsApp

### Manutenção Evolutiva
- Novas funcionalidades sob orçamento
- Integrações adicionais sob orçamento

---

## Stack Tecnológica Detalhada

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Fastify (alta performance)
- **Linguagem:** TypeScript (tipagem forte)
- **ORM:** Prisma (migrations, type-safety)
- **Autenticação:** JWT com refresh tokens
- **Filas:** BullMQ + Redis

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite (build rápido)
- **Estilização:** Tailwind CSS
- **Componentes:** shadcn/ui
- **Estado:** TanStack Query + Zustand
- **Formulários:** React Hook Form + Zod

### Banco de Dados
- **Principal:** PostgreSQL 15+
- **Cache/Sessões:** Redis 7+
- **Backups:** Automáticos diários

### Infraestrutura
- **Container:** Docker
- **Deploy:** Railway
- **SSL:** Automático (Let's Encrypt)
- **CDN:** Incluso no Railway

### Integrações
- **Pagamentos:** Asaas API
- **WhatsApp:** Evolution API
- **Excel:** ExcelJS
- **Email:** Nodemailer

---

**Proposta válida por 30 dias.**

**VistoriaSync - Automatizando a gestão de vistorias da Prates Vistorias**
