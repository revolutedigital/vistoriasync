# VistoriaSync - Sistema de Integração KSI-Flow

Sistema web para automação do fechamento mensal de vistorias, integrando dados do KSI com o sistema financeiro Flow.

## Stack Tecnológico

- **Backend**: Node.js 20, Fastify, TypeScript, Prisma
- **Banco de Dados**: PostgreSQL 15, Redis 7
- **Frontend**: React 18, Vite, Tailwind CSS, TanStack Query
- **Infraestrutura**: Docker, Docker Compose

## Requisitos

- Docker e Docker Compose
- Node.js 20+ (para desenvolvimento local)

## Início Rápido

### 1. Clonar e instalar dependências

```bash
# Instalar dependências
npm run install:all
```

### 2. Configurar variáveis de ambiente

```bash
# API
cp api/.env.example api/.env

# Editar api/.env com suas configurações
```

### 3. Iniciar com Docker

```bash
# Subir todos os serviços
npm run dev

# Ou com rebuild
npm run dev:build
```

### 4. Rodar migrations e seed

```bash
# Em outro terminal
npm run db:migrate
npm run db:seed
```

### 5. Acessar

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **Prisma Studio**: `npm run db:studio`

### Credenciais padrão

- **Email**: admin@pratesvistorias.com.br
- **Senha**: admin123

## Estrutura do Projeto

```
├── api/                    # Backend (Fastify + Prisma)
│   ├── prisma/            # Schema e migrations
│   └── src/
│       ├── config/        # Configurações
│       ├── lib/           # Clientes (Prisma, Redis)
│       ├── middlewares/   # Middlewares
│       ├── modules/       # Módulos da aplicação
│       │   ├── auth/
│       │   ├── fechamentos/
│       │   ├── imobiliarias/
│       │   ├── vistoriadores/
│       │   └── ...
│       └── utils/         # Utilitários
│
├── web/                    # Frontend (React + Vite)
│   └── src/
│       ├── components/    # Componentes reutilizáveis
│       ├── pages/         # Páginas da aplicação
│       ├── hooks/         # Custom hooks
│       ├── lib/           # API client, utils
│       ├── stores/        # Estado global (Zustand)
│       └── types/         # Tipos TypeScript
│
└── docker-compose.yml      # Configuração Docker
```

## Funcionalidades (MVP - Fase 1)

### Implementado

- [x] Autenticação JWT
- [x] CRUD de Imobiliárias
- [x] CRUD de Vistoriadores
- [x] CRUD de Tipos de Serviço
- [x] CRUD de Faixas de Metragem
- [x] Gestão de Fechamentos Mensais
- [x] Importação de planilha KSI (Excel)
- [x] Cálculo automático de valores
- [x] Exportação para Excel (Contas a Receber/Pagar)
- [x] Dashboard com KPIs
- [x] Interface responsiva

### Próximas Fases

- [ ] Portal do Vistoriador (Fase 2)
- [ ] Sistema de Contestações (Fase 2)
- [ ] Notificações WhatsApp (Fase 2)
- [ ] Integração Asaas - Boletos/PIX (Fase 3)
- [ ] Webhooks de pagamento (Fase 3)

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Subir com Docker
npm run dev:api          # Apenas API (local)
npm run dev:web          # Apenas Frontend (local)

# Banco de Dados
npm run db:migrate       # Rodar migrations
npm run db:seed          # Rodar seed
npm run db:studio        # Abrir Prisma Studio
npm run db:reset         # Reset completo do banco

# Build
npm run build            # Build de produção
```

## API Endpoints Principais

```
POST   /api/auth/login              # Login
GET    /api/auth/me                 # Usuário atual

GET    /api/fechamentos             # Listar fechamentos
POST   /api/fechamentos             # Criar fechamento
POST   /api/fechamentos/:id/importar    # Importar planilha
POST   /api/fechamentos/:id/calcular    # Calcular valores
GET    /api/fechamentos/:id/exportar/receber  # Exportar Excel
GET    /api/fechamentos/:id/exportar/pagar    # Exportar Excel

GET    /api/imobiliarias            # Listar imobiliárias
POST   /api/imobiliarias            # Criar imobiliária

GET    /api/vistoriadores           # Listar vistoriadores
POST   /api/vistoriadores           # Criar vistoriador

GET    /api/vistorias               # Listar vistorias
```

## Licença

Projeto privado - Prates Vistorias © 2024
