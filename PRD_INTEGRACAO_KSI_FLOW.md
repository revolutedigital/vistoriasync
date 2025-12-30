# PRD - Sistema de Integração KSI-Flow-Planilha

## Informações do Projeto

| Campo | Valor |
|-------|-------|
| **Nome do Projeto** | VistoriaSync |
| **Versão** | 1.0 |
| **Data** | Dezembro 2024 |
| **Cliente** | Pratas Vistorias |
| **Stack** | Node.js/TypeScript, PostgreSQL, Redis, Docker, Railway |

---

## 1. Visão Geral

### 1.1 Contexto do Problema

A Pratas Vistorias opera com dois sistemas principais que não se comunicam:

1. **KSI** - Sistema de gestão de vistorias de imóveis (SaaS externo)
2. **Flow** - Sistema financeiro para contas a pagar/receber (SaaS externo)

Entre esses sistemas, existe uma **Planilha Mestre** em Excel que serve como ponte manual, onde todo o processo de fechamento mensal é feito manualmente, gerando:

- **8-10 horas mensais** gastas em trabalho manual repetitivo
- **R$ 16.000+** em inadimplência por falta de acompanhamento automatizado
- **Erros de cálculo** por preenchimento manual de valores
- **Perda de receita** por falta de conciliação entre valores cobrados e pagos
- **Retrabalho** com vistoriadores contestando metragens

### 1.2 Objetivo da Solução

Criar um sistema web que:

1. **Importe automaticamente** dados do KSI (via export Excel ou API)
2. **Calcule automaticamente** valores de serviços e pagamentos baseado em tabelas configuráveis
3. **Gerencie contestações** de vistoriadores de forma organizada
4. **Exporte dados formatados** para o Flow
5. **Automatize cobranças** com integração a gateway de pagamento (Asaas ou similar)
6. **Acompanhe inadimplência** com alertas e lembretes automáticos

---

## 2. Arquitetura Técnica

### 2.1 Stack Tecnológico

```yaml
Backend:
  Runtime: Node.js 20 LTS
  Framework: Fastify ou Express
  Linguagem: TypeScript
  ORM: Prisma
  
Banco de Dados:
  Principal: PostgreSQL 15+
  Cache/Filas: Redis 7+
  
Frontend:
  Framework: React 18 + Vite
  UI: Tailwind CSS + shadcn/ui
  Estado: TanStack Query
  
Infraestrutura:
  Desenvolvimento: Docker + Docker Compose
  Deploy: Railway
  Storage: Railway Volume ou S3-compatible
  
Integrações:
  Pagamentos: Asaas API (boletos, PIX, notificações)
  Notificações: WhatsApp Business API (Evolution API ou similar)
  Excel: ExcelJS ou SheetJS
```

### 2.2 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Dashboard │ │Importação│ │Fechamento│ │Cobranças │ │Relatórios│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API REST (Fastify)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Auth    │ │ Vistorias│ │ Cálculos │ │Financeiro│ │ Exports  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────┐           ┌─────────────┐           ┌─────────────┐
│ PostgreSQL  │           │    Redis    │           │   Workers   │
│  - Dados    │           │  - Cache    │           │  - Imports  │
│  - Tabelas  │           │  - Sessions │           │  - Exports  │
│  - Histórico│           │  - Queues   │           │  - Notific. │
└─────────────┘           └─────────────┘           └─────────────┘
                                                           │
                          ┌────────────────────────────────┼────────┐
                          ▼                                ▼        ▼
                   ┌──────────┐                     ┌──────────┐ ┌──────────┐
                   │  Asaas   │                     │ WhatsApp │ │  Email   │
                   │(Boletos) │                     │  (Aviso) │ │ (Backup) │
                   └──────────┘                     └──────────┘ └──────────┘
```

### 2.3 Docker Compose (Desenvolvimento)

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/vistoriasync
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=development
    volumes:
      - ./api:/app
      - /app/node_modules
    depends_on:
      - db
      - redis

  web:
    build:
      context: ./web
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./web:/app
      - /app/node_modules
    depends_on:
      - api

  worker:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    command: npm run worker
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/vistoriasync
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./api:/app
      - /app/node_modules
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=vistoriasync
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 3. Modelo de Dados (Prisma Schema)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== USUÁRIOS E AUTH ====================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String
  role          UserRole  @default(OPERADOR)
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  logs          AuditLog[]
}

enum UserRole {
  ADMIN
  GERENTE
  OPERADOR
}

// ==================== IMOBILIÁRIAS ====================

model Imobiliaria {
  id              String    @id @default(cuid())
  nome            String
  nomeKsi         String    @unique // Nome exato como aparece no KSI
  cnpj            String?   @unique
  email           String?
  telefone        String?
  whatsapp        String?
  cidade          String?
  ativo           Boolean   @default(true)
  
  // Dados financeiros
  diaPagamento    Int       @default(12) // Dia do mês para vencimento
  formaPagamento  FormaPagamento @default(BOLETO)
  
  // Integração Asaas
  asaasCustomerId String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  tabelaPrecos    TabelaPreco[]
  vistorias       Vistoria[]
  faturas         Fatura[]
}

enum FormaPagamento {
  BOLETO
  PIX
  TRANSFERENCIA
}

// ==================== VISTORIADORES ====================

model Vistoriador {
  id              String    @id @default(cuid())
  nome            String
  nomeKsi         String    @unique // Nome exato como aparece no KSI
  cpf             String?   @unique
  email           String?
  telefone        String?
  whatsapp        String?
  cidade          String?
  chavePix        String?
  ativo           Boolean   @default(true)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  tabelaPagamentos TabelaPagamentoVistoriador[]
  vistorias        Vistoria[]
  pagamentos       PagamentoVistoriador[]
  contestacoes     Contestacao[]
}

// ==================== TABELAS DE PREÇOS ====================

model TipoServico {
  id              String    @id @default(cuid())
  codigo          String    @unique // Ex: "1.0", "2.1", "3.0"
  nome            String    // Ex: "VISTORIA DE ENTRADA"
  descricao       String?
  ativo           Boolean   @default(true)
  
  tabelaPrecos    TabelaPreco[]
  tabelaPagamentos TabelaPagamentoVistoriador[]
  vistorias       Vistoria[]
}

model FaixaMetragem {
  id              String    @id @default(cuid())
  nome            String    // Ex: "Até 150 m²"
  metrosMin       Float     // Ex: 0
  metrosMax       Float     // Ex: 150
  multiplicador   Float     @default(1) // Ex: 1 = 1 vistoria, 1.5 = 1.5 vistorias
  ordem           Int       @default(0)
  
  tabelaPrecos    TabelaPreco[]
  tabelaPagamentos TabelaPagamentoVistoriador[]
}

// Tabela de preços: Imobiliária x TipoServico x FaixaMetragem
model TabelaPreco {
  id              String    @id @default(cuid())
  
  imobiliariaId   String
  imobiliaria     Imobiliaria @relation(fields: [imobiliariaId], references: [id])
  
  tipoServicoId   String
  tipoServico     TipoServico @relation(fields: [tipoServicoId], references: [id])
  
  faixaMetragemId String?
  faixaMetragem   FaixaMetragem? @relation(fields: [faixaMetragemId], references: [id])
  
  valorBase       Decimal   @db.Decimal(10, 2) // Valor base do serviço
  valorMobiliado  Decimal?  @db.Decimal(10, 2) // Adicional se mobiliado
  valorSemiMob    Decimal?  @db.Decimal(10, 2) // Adicional se semi-mobiliado
  
  ativo           Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([imobiliariaId, tipoServicoId, faixaMetragemId])
}

// Tabela de pagamentos: Vistoriador x TipoServico x FaixaMetragem
model TabelaPagamentoVistoriador {
  id              String    @id @default(cuid())
  
  vistoriadorId   String
  vistoriador     Vistoriador @relation(fields: [vistoriadorId], references: [id])
  
  tipoServicoId   String
  tipoServico     TipoServico @relation(fields: [tipoServicoId], references: [id])
  
  faixaMetragemId String?
  faixaMetragem   FaixaMetragem? @relation(fields: [faixaMetragemId], references: [id])
  
  valorBase       Decimal   @db.Decimal(10, 2)
  valorMobiliado  Decimal?  @db.Decimal(10, 2)
  valorSemiMob    Decimal?  @db.Decimal(10, 2)
  
  ativo           Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([vistoriadorId, tipoServicoId, faixaMetragemId])
}

// ==================== VISTORIAS ====================

model Fechamento {
  id              String    @id @default(cuid())
  mesReferencia   Int       // Ex: 11 (novembro)
  anoReferencia   Int       // Ex: 2024
  status          StatusFechamento @default(RASCUNHO)
  
  dataImportacao  DateTime?
  dataEnvioVist   DateTime? // Data que enviou para vistoriadores
  dataEnvioImob   DateTime? // Data que enviou para imobiliárias
  dataFinalizado  DateTime?
  
  totalVistorias  Int       @default(0)
  totalReceber    Decimal   @default(0) @db.Decimal(12, 2)
  totalPagar      Decimal   @default(0) @db.Decimal(12, 2)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  vistorias       Vistoria[]
  faturas         Fatura[]
  pagamentos      PagamentoVistoriador[]
  
  @@unique([mesReferencia, anoReferencia])
}

enum StatusFechamento {
  RASCUNHO
  IMPORTADO
  CALCULADO
  AGUARDANDO_VISTORIADORES
  EM_REVISAO
  AGUARDANDO_IMOBILIARIAS
  FATURADO
  FINALIZADO
}

model Vistoria {
  id              String    @id @default(cuid())
  
  // Referências
  fechamentoId    String
  fechamento      Fechamento @relation(fields: [fechamentoId], references: [id])
  
  imobiliariaId   String
  imobiliaria     Imobiliaria @relation(fields: [imobiliariaId], references: [id])
  
  vistoriadorId   String
  vistoriador     Vistoriador @relation(fields: [vistoriadorId], references: [id])
  
  tipoServicoId   String
  tipoServico     TipoServico @relation(fields: [tipoServicoId], references: [id])
  
  // Dados do KSI
  idKsi           String    // ID original do KSI
  numeroContrato  String?
  endereco        String
  cidade          String
  
  // Metragens
  areaInformada   Float?    // Área informada pela imobiliária
  areaAferida     Float?    // Área medida pelo vistoriador
  areaFaturar     Float     // Área final para faturamento
  
  // Mobiliado
  tipoMobilia     TipoMobilia @default(NAO)
  
  // Datas
  dataAgenda      DateTime?
  dataFinalizado  DateTime?
  
  // Valores calculados
  valorServico    Decimal   @db.Decimal(10, 2) // Valor a cobrar da imobiliária
  valorVistoriador Decimal  @db.Decimal(10, 2) // Valor a pagar ao vistoriador
  
  // Status
  status          StatusVistoria @default(IMPORTADA)
  observacao      String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  contestacoes    Contestacao[]
  
  @@unique([fechamentoId, idKsi])
}

enum TipoMobilia {
  NAO
  SEMI
  SIM
}

enum StatusVistoria {
  IMPORTADA
  CALCULADA
  CONTESTADA
  REVISADA
  APROVADA
  FATURADA
}

// ==================== CONTESTAÇÕES ====================

model Contestacao {
  id              String    @id @default(cuid())
  
  vistoriaId      String
  vistoria        Vistoria  @relation(fields: [vistoriaId], references: [id])
  
  vistoriadorId   String
  vistoriador     Vistoriador @relation(fields: [vistoriadorId], references: [id])
  
  tipo            TipoContestacao
  descricao       String
  
  // Valores contestados
  areaContestada  Float?    // Nova metragem sugerida
  valorContestado Decimal?  @db.Decimal(10, 2)
  
  status          StatusContestacao @default(PENDENTE)
  respostaAdmin   String?
  
  createdAt       DateTime  @default(now())
  resolvidoAt     DateTime?
  resolvidoPor    String?
}

enum TipoContestacao {
  METRAGEM
  MOBILIADO
  TIPO_SERVICO
  VALOR
  OUTRO
}

enum StatusContestacao {
  PENDENTE
  ACEITA
  RECUSADA
  PARCIAL
}

// ==================== FINANCEIRO ====================

model Fatura {
  id              String    @id @default(cuid())
  
  fechamentoId    String
  fechamento      Fechamento @relation(fields: [fechamentoId], references: [id])
  
  imobiliariaId   String
  imobiliaria     Imobiliaria @relation(fields: [imobiliariaId], references: [id])
  
  numero          String    @unique
  valor           Decimal   @db.Decimal(12, 2)
  dataVencimento  DateTime
  
  // Integração Asaas
  asaasPaymentId  String?
  asaasBoletoUrl  String?
  asaasPixQrCode  String?
  asaasPixCopiaECola String?
  
  status          StatusFatura @default(PENDENTE)
  dataPagamento   DateTime?
  valorPago       Decimal?  @db.Decimal(12, 2)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([status, dataVencimento])
}

enum StatusFatura {
  PENDENTE
  ENVIADA
  VENCIDA
  PAGA
  CANCELADA
}

model PagamentoVistoriador {
  id              String    @id @default(cuid())
  
  fechamentoId    String
  fechamento      Fechamento @relation(fields: [fechamentoId], references: [id])
  
  vistoriadorId   String
  vistoriador     Vistoriador @relation(fields: [vistoriadorId], references: [id])
  
  valor           Decimal   @db.Decimal(12, 2)
  dataPrevista    DateTime
  
  status          StatusPagamento @default(PENDENTE)
  dataPagamento   DateTime?
  comprovante     String?   // URL do comprovante
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum StatusPagamento {
  PENDENTE
  AGENDADO
  PAGO
  CANCELADO
}

// ==================== AUDITORIA ====================

model AuditLog {
  id          String    @id @default(cuid())
  
  userId      String?
  user        User?     @relation(fields: [userId], references: [id])
  
  action      String    // Ex: "vistoria.update", "fatura.create"
  entity      String    // Ex: "Vistoria", "Fatura"
  entityId    String
  
  oldData     Json?
  newData     Json?
  
  ip          String?
  userAgent   String?
  
  createdAt   DateTime  @default(now())
  
  @@index([entity, entityId])
  @@index([createdAt])
}
```

---

## 4. Funcionalidades Detalhadas

### 4.1 Módulo de Importação (KSI → Sistema)

#### 4.1.1 Upload de Planilha

**Endpoint:** `POST /api/fechamentos/:id/importar`

**Fluxo:**
1. Usuário faz upload do arquivo Excel exportado do KSI
2. Sistema valida estrutura do arquivo
3. Worker processa em background (Redis Queue)
4. Para cada linha:
   - Busca/cria Imobiliária pelo nome
   - Busca/cria Vistoriador pelo nome
   - Identifica TipoServico pelo código/nome
   - Extrai cidade do endereço (regex ou split)
   - Cria registro de Vistoria
5. Atualiza status do Fechamento para `IMPORTADO`

**Mapeamento de Colunas (baseado na planilha analisada):**

```typescript
interface LinhaKSI {
  id: string;                    // Coluna "id"
  numeroContrato: string;        // Coluna "N° Contrato"
  cliente: string;               // Coluna "Cliente" → Imobiliária
  vistoriadores: string;         // Coluna "Vistoriadores"
  endereco: string;              // Coluna "Endereço"
  cidade: string;                // Coluna "Cidade" (ou extrair do endereço)
  areaInformada: number;         // Coluna "Área Infor."
  areaAferida: number;           // Coluna "Área Aferida"
  areaFaturar: number;           // Coluna "Área à Faturar"
  mobiliado: 'SIM' | 'NÃO' | 'SEMI'; // Coluna "Mobiliado"
  tipoServico: string;           // Coluna "Tipo Serviço"
  valorServico: number;          // Coluna "Valor Serviço" (pode vir vazio)
  valorVistoriador: number;      // Coluna "Valor Vistoriador" (pode vir vazio)
  dataAgenda: Date;              // Coluna "Data Agenda"
  dataFinalizado: Date;          // Coluna "Data Finalizado"
}
```

#### 4.1.2 Extração de Cidade do Endereço

```typescript
// Padrão observado: "Rua X, 123 - Bairro Y - Cidade/UF - CEP: 00000-000"
function extrairCidade(endereco: string): string {
  // Tenta extrair pelo padrão "Cidade/UF"
  const match = endereco.match(/([A-Za-zÀ-ÿ\s]+)\/[A-Z]{2}\s*-?\s*CEP/i);
  if (match) return match[1].trim();
  
  // Fallback: última parte antes do CEP
  const partes = endereco.split('-');
  for (let i = partes.length - 1; i >= 0; i--) {
    if (!partes[i].includes('CEP') && partes[i].match(/[A-Z]{2}/)) {
      return partes[i].replace(/\/[A-Z]{2}.*/, '').trim();
    }
  }
  
  return 'NÃO IDENTIFICADA';
}
```

### 4.2 Módulo de Cálculo de Valores

#### 4.2.1 Algoritmo de Cálculo

```typescript
interface CalculoVistoria {
  vistoriaId: string;
  valorServico: Decimal;
  valorVistoriador: Decimal;
  faixaMetragem: string;
  multiplicador: number;
  detalhes: string;
}

async function calcularValorVistoria(vistoria: Vistoria): Promise<CalculoVistoria> {
  // 1. Buscar tabela de preço da imobiliária
  const tabelaPreco = await prisma.tabelaPreco.findFirst({
    where: {
      imobiliariaId: vistoria.imobiliariaId,
      tipoServicoId: vistoria.tipoServicoId,
      ativo: true,
    },
    include: { faixaMetragem: true }
  });
  
  if (!tabelaPreco) {
    throw new Error(`Tabela de preço não encontrada para ${vistoria.imobiliariaId}`);
  }
  
  // 2. Determinar faixa de metragem
  const area = vistoria.areaFaturar;
  const faixas = await prisma.faixaMetragem.findMany({
    orderBy: { ordem: 'asc' }
  });
  
  const faixa = faixas.find(f => area >= f.metrosMin && area <= f.metrosMax);
  const multiplicador = faixa?.multiplicador || 1;
  
  // 3. Calcular valor base
  let valorBase = tabelaPreco.valorBase.mul(multiplicador);
  
  // 4. Adicionar valor mobiliado
  if (vistoria.tipoMobilia === 'SIM' && tabelaPreco.valorMobiliado) {
    valorBase = valorBase.add(tabelaPreco.valorMobiliado);
  } else if (vistoria.tipoMobilia === 'SEMI' && tabelaPreco.valorSemiMob) {
    valorBase = valorBase.add(tabelaPreco.valorSemiMob);
  }
  
  // 5. Buscar valor do vistoriador
  const tabelaPagamento = await prisma.tabelaPagamentoVistoriador.findFirst({
    where: {
      vistoriadorId: vistoria.vistoriadorId,
      tipoServicoId: vistoria.tipoServicoId,
      ativo: true,
    }
  });
  
  let valorVistoriador = tabelaPagamento?.valorBase.mul(multiplicador) || new Decimal(0);
  
  if (vistoria.tipoMobilia === 'SIM' && tabelaPagamento?.valorMobiliado) {
    valorVistoriador = valorVistoriador.add(tabelaPagamento.valorMobiliado);
  }
  
  return {
    vistoriaId: vistoria.id,
    valorServico: valorBase,
    valorVistoriador,
    faixaMetragem: faixa?.nome || 'Padrão',
    multiplicador,
    detalhes: `Base: ${tabelaPreco.valorBase} x ${multiplicador} = ${valorBase}`
  };
}
```

#### 4.2.2 Faixas de Metragem Padrão

Baseado na planilha "Tabela" analisada:

| Faixa | Metros Min | Metros Max | Multiplicador | Nome |
|-------|------------|------------|---------------|------|
| 1 | 0 | 150 | 1.0 | Até 150 m² |
| 2 | 151 | 225 | 1.5 | 151 até 225 m² |
| 3 | 226 | 300 | 2.0 | 226 até 300 m² |
| 4 | 301 | 375 | 2.5 | 301 até 375 m² |
| 5 | 376 | 450 | 3.0 | 376 até 450 m² |
| 6 | 451 | 525 | 3.5 | 451 até 525 m² |
| 7 | 526 | 600 | 4.0 | 526 até 600 m² |
| 8 | 601 | 999999 | 5.0 | Acima de 600 m² |

### 4.3 Módulo de Contestações

#### 4.3.1 Fluxo de Contestação

```
[Fechamento Calculado]
         │
         ▼
[Gerar Planilhas por Vistoriador]
         │
         ▼
[Enviar para Vistoriadores] ──────────────┐
         │                                │
         ▼                                ▼
[Vistoriador Acessa Portal]      [Envio via WhatsApp]
         │                                │
         ▼                                │
[Revisa Suas Vistorias] ◄─────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[Aprova]  [Contesta]
    │         │
    │         ▼
    │    [Admin Recebe]
    │         │
    │    ┌────┴────┐
    │    │         │
    │    ▼         ▼
    │ [Aceita] [Recusa]
    │    │         │
    │    ▼         │
    │ [Recalcula]  │
    │    │         │
    └────┴─────────┘
         │
         ▼
[Todas Aprovadas?]
         │
    ┌────┴────┐
    │ SIM     │ NÃO
    ▼         ▼
[Finaliza] [Aguarda]
```

#### 4.3.2 Portal do Vistoriador (Simplificado)

```typescript
// Rota pública com token único
// GET /vistoriador/:token/fechamento/:fechamentoId

interface PortalVistoriador {
  vistoriador: {
    nome: string;
    totalVistorias: number;
    totalValor: Decimal;
  };
  vistorias: {
    id: string;
    endereco: string;
    cidade: string;
    areaFaturar: number;
    tipoServico: string;
    mobiliado: string;
    valor: Decimal;
    status: StatusVistoria;
    podeContestar: boolean;
  }[];
  resumo: {
    aprovadas: number;
    contestadas: number;
    pendentes: number;
  };
}
```

### 4.4 Módulo de Faturamento

#### 4.4.1 Geração de Faturas por Imobiliária

```typescript
async function gerarFaturasDoFechamento(fechamentoId: string) {
  const fechamento = await prisma.fechamento.findUnique({
    where: { id: fechamentoId },
    include: {
      vistorias: {
        where: { status: 'APROVADA' },
        include: { imobiliaria: true }
      }
    }
  });
  
  // Agrupar por imobiliária
  const porImobiliaria = fechamento.vistorias.reduce((acc, v) => {
    if (!acc[v.imobiliariaId]) {
      acc[v.imobiliariaId] = {
        imobiliaria: v.imobiliaria,
        vistorias: [],
        total: new Decimal(0)
      };
    }
    acc[v.imobiliariaId].vistorias.push(v);
    acc[v.imobiliariaId].total = acc[v.imobiliariaId].total.add(v.valorServico);
    return acc;
  }, {});
  
  // Gerar faturas
  const faturas = [];
  for (const [imobId, dados] of Object.entries(porImobiliaria)) {
    const vencimento = calcularVencimento(
      fechamento.mesReferencia,
      fechamento.anoReferencia,
      dados.imobiliaria.diaPagamento
    );
    
    const fatura = await prisma.fatura.create({
      data: {
        fechamentoId,
        imobiliariaId: imobId,
        numero: gerarNumeroFatura(fechamento, imobId),
        valor: dados.total,
        dataVencimento: vencimento,
        status: 'PENDENTE'
      }
    });
    
    faturas.push(fatura);
  }
  
  return faturas;
}
```

#### 4.4.2 Integração Asaas

```typescript
// services/asaas.service.ts

interface AsaasConfig {
  apiKey: string;
  baseUrl: string; // sandbox ou production
}

class AsaasService {
  constructor(private config: AsaasConfig) {}
  
  async criarCobranca(fatura: Fatura, imobiliaria: Imobiliaria) {
    // 1. Garantir que cliente existe no Asaas
    let customerId = imobiliaria.asaasCustomerId;
    if (!customerId) {
      customerId = await this.criarCliente(imobiliaria);
    }
    
    // 2. Criar cobrança
    const response = await fetch(`${this.config.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': this.config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: imobiliaria.formaPagamento === 'PIX' ? 'PIX' : 'BOLETO',
        value: fatura.valor.toNumber(),
        dueDate: fatura.dataVencimento.toISOString().split('T')[0],
        description: `Vistorias - Ref. ${fatura.fechamento.mesReferencia}/${fatura.fechamento.anoReferencia}`,
        externalReference: fatura.id,
        // Configurações de notificação
        postalService: false, // Não enviar correio
      })
    });
    
    const data = await response.json();
    
    // 3. Atualizar fatura com dados do Asaas
    await prisma.fatura.update({
      where: { id: fatura.id },
      data: {
        asaasPaymentId: data.id,
        asaasBoletoUrl: data.bankSlipUrl,
        asaasPixQrCode: data.pixQrCodeImage,
        asaasPixCopiaECola: data.pixCopyAndPaste,
        status: 'ENVIADA'
      }
    });
    
    return data;
  }
  
  // Webhook para receber confirmações de pagamento
  async processarWebhook(payload: any) {
    if (payload.event === 'PAYMENT_RECEIVED') {
      const fatura = await prisma.fatura.findFirst({
        where: { asaasPaymentId: payload.payment.id }
      });
      
      if (fatura) {
        await prisma.fatura.update({
          where: { id: fatura.id },
          data: {
            status: 'PAGA',
            dataPagamento: new Date(payload.payment.paymentDate),
            valorPago: payload.payment.value
          }
        });
      }
    }
  }
}
```

### 4.5 Módulo de Exportação (Sistema → Flow)

#### 4.5.1 Exportar Contas a Receber

```typescript
async function exportarContasReceber(fechamentoId: string): Promise<Buffer> {
  const faturas = await prisma.fatura.findMany({
    where: { fechamentoId },
    include: { imobiliaria: true }
  });
  
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Contas a Receber');
  
  sheet.columns = [
    { header: 'Cliente', key: 'cliente', width: 30 },
    { header: 'Valor', key: 'valor', width: 15 },
    { header: 'Vencimento', key: 'vencimento', width: 15 },
    { header: 'Forma Pagamento', key: 'forma', width: 15 },
    { header: 'Referência', key: 'referencia', width: 25 },
    { header: 'Banco', key: 'banco', width: 20 },
  ];
  
  faturas.forEach(f => {
    sheet.addRow({
      cliente: f.imobiliaria.nome,
      valor: f.valor.toNumber(),
      vencimento: f.dataVencimento,
      forma: f.imobiliaria.formaPagamento,
      referencia: `Vistorias ${f.fechamento.mesReferencia}/${f.fechamento.anoReferencia}`,
      banco: 'Asaas' // ou outro banco configurado
    });
  });
  
  return await workbook.xlsx.writeBuffer();
}
```

#### 4.5.2 Exportar Contas a Pagar

```typescript
async function exportarContasPagar(fechamentoId: string): Promise<Buffer> {
  const pagamentos = await prisma.pagamentoVistoriador.findMany({
    where: { fechamentoId },
    include: { vistoriador: true }
  });
  
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Contas a Pagar');
  
  sheet.columns = [
    { header: 'Fornecedor', key: 'fornecedor', width: 30 },
    { header: 'CPF', key: 'cpf', width: 15 },
    { header: 'Valor', key: 'valor', width: 15 },
    { header: 'Data Pagamento', key: 'data', width: 15 },
    { header: 'Chave PIX', key: 'pix', width: 30 },
    { header: 'Referência', key: 'referencia', width: 25 },
  ];
  
  pagamentos.forEach(p => {
    sheet.addRow({
      fornecedor: p.vistoriador.nome,
      cpf: p.vistoriador.cpf,
      valor: p.valor.toNumber(),
      data: p.dataPrevista,
      pix: p.vistoriador.chavePix,
      referencia: `Vistorias ${p.fechamento.mesReferencia}/${p.fechamento.anoReferencia}`
    });
  });
  
  return await workbook.xlsx.writeBuffer();
}
```

### 4.6 Módulo de Notificações

#### 4.6.1 Tipos de Notificação

| Evento | Canal | Destinatário | Conteúdo |
|--------|-------|--------------|----------|
| Planilha pronta para revisão | WhatsApp | Vistoriador | Link + resumo valores |
| Contestação recebida | WhatsApp | Admin | Detalhes da contestação |
| Contestação resolvida | WhatsApp | Vistoriador | Resultado |
| Fatura gerada | WhatsApp + Email | Imobiliária | Boleto/PIX + resumo |
| Fatura vencendo (D-3) | WhatsApp | Imobiliária | Lembrete |
| Fatura vencida | WhatsApp + Email | Imobiliária | Cobrança |
| Pagamento confirmado | WhatsApp | Imobiliária | Confirmação |

#### 4.6.2 Templates WhatsApp

```typescript
const templates = {
  planilhaVistoriador: (nome: string, total: number, link: string) => `
Olá ${nome}! 👋

Sua planilha de vistorias do mês está pronta para revisão.

💰 *Valor total: R$ ${total.toFixed(2)}*

📋 Acesse aqui para conferir e aprovar:
${link}

Você tem 3 dias para revisar. Após esse prazo, consideramos aprovado automaticamente.

_Pratas Vistorias_
  `.trim(),
  
  faturaGerada: (nome: string, valor: number, vencimento: string, linkBoleto: string) => `
Olá ${nome}! 👋

Sua fatura de vistorias foi gerada.

💰 *Valor: R$ ${valor.toFixed(2)}*
📅 *Vencimento: ${vencimento}*

📄 Acesse seu boleto:
${linkBoleto}

_Pratas Vistorias_
  `.trim(),
  
  lembreteVencimento: (nome: string, valor: number, vencimento: string) => `
Olá ${nome}! 👋

Lembrete: sua fatura de *R$ ${valor.toFixed(2)}* vence em *${vencimento}*.

Evite juros! Pague antes do vencimento.

_Pratas Vistorias_
  `.trim(),
};
```

---

## 5. API Endpoints

### 5.1 Autenticação

```
POST   /api/auth/login          # Login
POST   /api/auth/logout         # Logout
POST   /api/auth/refresh        # Refresh token
GET    /api/auth/me             # Usuário atual
```

### 5.2 Fechamentos

```
GET    /api/fechamentos                    # Listar fechamentos
POST   /api/fechamentos                    # Criar novo fechamento
GET    /api/fechamentos/:id                # Detalhes do fechamento
PATCH  /api/fechamentos/:id                # Atualizar fechamento
DELETE /api/fechamentos/:id                # Excluir fechamento

POST   /api/fechamentos/:id/importar       # Upload planilha KSI
POST   /api/fechamentos/:id/calcular       # Calcular valores
POST   /api/fechamentos/:id/enviar-vistoriadores  # Enviar para revisão
POST   /api/fechamentos/:id/faturar        # Gerar faturas
POST   /api/fechamentos/:id/finalizar      # Finalizar fechamento

GET    /api/fechamentos/:id/resumo         # Resumo do fechamento
GET    /api/fechamentos/:id/vistorias      # Vistorias do fechamento
GET    /api/fechamentos/:id/exportar/receber    # Exportar contas a receber
GET    /api/fechamentos/:id/exportar/pagar      # Exportar contas a pagar
```

### 5.3 Vistorias

```
GET    /api/vistorias                      # Listar vistorias
GET    /api/vistorias/:id                  # Detalhes da vistoria
PATCH  /api/vistorias/:id                  # Atualizar vistoria
POST   /api/vistorias/:id/recalcular       # Recalcular valores
```

### 5.4 Contestações

```
GET    /api/contestacoes                   # Listar contestações
GET    /api/contestacoes/:id               # Detalhes
PATCH  /api/contestacoes/:id/resolver      # Resolver contestação
```

### 5.5 Cadastros

```
# Imobiliárias
GET    /api/imobiliarias
POST   /api/imobiliarias
GET    /api/imobiliarias/:id
PATCH  /api/imobiliarias/:id
DELETE /api/imobiliarias/:id
GET    /api/imobiliarias/:id/tabela-precos

# Vistoriadores
GET    /api/vistoriadores
POST   /api/vistoriadores
GET    /api/vistoriadores/:id
PATCH  /api/vistoriadores/:id
DELETE /api/vistoriadores/:id
GET    /api/vistoriadores/:id/tabela-pagamentos

# Tipos de Serviço
GET    /api/tipos-servico
POST   /api/tipos-servico
PATCH  /api/tipos-servico/:id

# Faixas de Metragem
GET    /api/faixas-metragem
POST   /api/faixas-metragem
PATCH  /api/faixas-metragem/:id
```

### 5.6 Financeiro

```
# Faturas
GET    /api/faturas                        # Listar faturas
GET    /api/faturas/:id                    # Detalhes
POST   /api/faturas/:id/enviar             # Enviar cobrança
POST   /api/faturas/:id/cancelar           # Cancelar
PATCH  /api/faturas/:id/baixa-manual       # Dar baixa manual

# Pagamentos Vistoriadores
GET    /api/pagamentos-vistoriadores
PATCH  /api/pagamentos-vistoriadores/:id/pagar

# Webhook Asaas
POST   /api/webhooks/asaas
```

### 5.7 Portal Vistoriador (Público)

```
GET    /portal/:token                      # Dados do vistoriador
GET    /portal/:token/fechamentos/:id      # Vistorias do fechamento
POST   /portal/:token/vistorias/:id/aprovar
POST   /portal/:token/vistorias/:id/contestar
```

---

## 6. Interface do Usuário

### 6.1 Telas Principais

#### Dashboard
- KPIs: Total mês atual, inadimplência, contestações pendentes
- Gráficos: Evolução mensal, por cidade, por imobiliária
- Alertas: Faturas vencidas, contestações pendentes, fechamentos atrasados

#### Fechamento Mensal
- Wizard de 5 etapas:
  1. **Importação** - Upload Excel do KSI
  2. **Cálculo** - Aplicar tabelas de preço (com preview)
  3. **Revisão Vistoriadores** - Aguardar/resolver contestações
  4. **Faturamento** - Gerar faturas e boletos
  5. **Finalização** - Resumo e exportações

#### Cadastro de Tabelas de Preço
- Matriz: Imobiliária x Tipo Serviço x Faixa Metragem
- Edição em massa
- Histórico de alterações

#### Gestão de Cobranças
- Kanban: Pendente → Enviada → Paga / Vencida
- Filtros por período, imobiliária, status
- Ações em massa: Enviar lembretes, gerar relatório inadimplência

### 6.2 Wireframes Conceituais

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏠 VistoriaSync                     [Fechamentos] [Cadastros] [👤] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │  R$ 174.059  │ │   R$ 16.420  │ │      12      │ │     3      │ │
│  │  Faturamento │ │ Inadimplente │ │ Contestações │ │  Vencidas  │ │
│  │    ▲ 12%     │ │    ▼ 8%      │ │  pendentes   │ │  > 30 dias │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│                                                                     │
│  ┌─────────────────────────────────┐ ┌───────────────────────────┐ │
│  │ Fechamentos Recentes            │ │ Contestações Pendentes    │ │
│  ├─────────────────────────────────┤ ├───────────────────────────┤ │
│  │ ○ Novembro/2024    [EM REVISÃO] │ │ Anderson - Metragem       │ │
│  │ ● Outubro/2024     [FINALIZADO] │ │ Carlos - Mobiliado        │ │
│  │ ● Setembro/2024    [FINALIZADO] │ │ Maria - Valor             │ │
│  └─────────────────────────────────┘ └───────────────────────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Faturas por Status                                          │   │
│  │ ████████████████████████░░░░░░░░░░  Pagas: 72%             │   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░████████░░  Pendentes: 18%         │   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████  Vencidas: 10%          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Configuração do Ambiente

### 7.1 Variáveis de Ambiente

```env
# .env.example

# Aplicação
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
WEB_URL=http://localhost:5173

# Banco de Dados
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vistoriasync

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=sua-chave-secreta-muito-longa-aqui
JWT_EXPIRES_IN=7d

# Asaas (Pagamentos)
ASAAS_API_KEY=sua-api-key
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
ASAAS_WEBHOOK_TOKEN=token-para-validar-webhooks

# WhatsApp (Evolution API ou similar)
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_KEY=sua-api-key
WHATSAPP_INSTANCE=pratas

# Email (opcional, backup)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASS=sua-senha-app
```

### 7.2 Scripts de Desenvolvimento

```json
{
  "scripts": {
    "dev": "docker-compose up",
    "dev:api": "cd api && npm run dev",
    "dev:web": "cd web && npm run dev",
    "db:migrate": "cd api && npx prisma migrate dev",
    "db:seed": "cd api && npx prisma db seed",
    "db:studio": "cd api && npx prisma studio",
    "test": "cd api && npm test",
    "build": "cd api && npm run build && cd ../web && npm run build"
  }
}
```

### 7.3 Deploy Railway

```yaml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start:prod"
healthcheckPath = "/health"
healthcheckTimeout = 30

[[services]]
name = "api"
port = 3000

[[services]]
name = "worker"
command = "npm run worker"
```

---

## 8. Cronograma Sugerido

### Fase 1 - MVP (4-6 semanas)
- Setup do projeto (Docker, Prisma, estrutura)
- CRUD de cadastros básicos (Imobiliárias, Vistoriadores, Tipos de Serviço)
- Importação de planilha KSI
- Cálculo automático de valores
- Exportação para Excel (formato Flow)

### Fase 2 - Contestações (2-3 semanas)
- Portal do vistoriador (simplificado)
- Sistema de contestações
- Notificações WhatsApp básicas

### Fase 3 - Faturamento (3-4 semanas)
- Integração Asaas completa
- Geração automática de boletos/PIX
- Webhooks de confirmação
- Dashboard de inadimplência

### Fase 4 - Polimento (2-3 semanas)
- Dashboard com métricas
- Relatórios avançados
- Otimizações de performance
- Testes e correções

---

## 9. Métricas de Sucesso

| Métrica | Atual | Meta |
|---------|-------|------|
| Tempo de fechamento mensal | 8-10 horas | < 2 horas |
| Erros de cálculo | ~5% | < 0.5% |
| Taxa de inadimplência | ~10% | < 3% |
| Contestações não resolvidas | Muitas | Zero após 5 dias |
| Satisfação vistoriadores | Baixa | Alta (processo claro) |

---

## 10. Considerações Finais

### 10.1 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| KSI muda formato do Excel | Média | Alto | Parser flexível + alertas de erro |
| Asaas fora do ar | Baixa | Médio | Fila de retry + fallback manual |
| Resistência dos vistoriadores | Média | Médio | Treinamento + suporte inicial |
| Dados inconsistentes legado | Alta | Médio | Validações + limpeza inicial |

### 10.2 Próximos Passos

1. Validar PRD com stakeholders
2. Definir prioridades do MVP
3. Setup inicial do repositório
4. Iniciar desenvolvimento da Fase 1

---

**Documento criado para uso com Claude Code**  
**Última atualização: Dezembro 2024**
