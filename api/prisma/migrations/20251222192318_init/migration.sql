-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'GERENTE', 'OPERADOR');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('BOLETO', 'PIX', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "StatusFechamento" AS ENUM ('RASCUNHO', 'IMPORTADO', 'CALCULADO', 'AGUARDANDO_VISTORIADORES', 'EM_REVISAO', 'AGUARDANDO_IMOBILIARIAS', 'FATURADO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "TipoMobilia" AS ENUM ('NAO', 'SEMI', 'SIM');

-- CreateEnum
CREATE TYPE "StatusVistoria" AS ENUM ('IMPORTADA', 'CALCULADA', 'CONTESTADA', 'REVISADA', 'APROVADA', 'FATURADA');

-- CreateEnum
CREATE TYPE "TipoContestacao" AS ENUM ('METRAGEM', 'MOBILIADO', 'TIPO_SERVICO', 'VALOR', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusContestacao" AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA', 'PARCIAL');

-- CreateEnum
CREATE TYPE "StatusFatura" AS ENUM ('PENDENTE', 'ENVIADA', 'VENCIDA', 'PAGA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'AGENDADO', 'PAGO', 'CANCELADO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERADOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imobiliarias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeKsi" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "cidade" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "diaPagamento" INTEGER NOT NULL DEFAULT 12,
    "formaPagamento" "FormaPagamento" NOT NULL DEFAULT 'BOLETO',
    "asaasCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imobiliarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vistoriadores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeKsi" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "cidade" TEXT,
    "chavePix" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "portalToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vistoriadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_servico" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faixas_metragem" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "metrosMin" DOUBLE PRECISION NOT NULL,
    "metrosMax" DOUBLE PRECISION NOT NULL,
    "multiplicador" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "faixas_metragem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabelas_preco" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "tipoServicoId" TEXT NOT NULL,
    "faixaMetragemId" TEXT,
    "valorBase" DECIMAL(10,2) NOT NULL,
    "valorMobiliado" DECIMAL(10,2),
    "valorSemiMob" DECIMAL(10,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabelas_preco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabelas_pagamento_vistoriador" (
    "id" TEXT NOT NULL,
    "vistoriadorId" TEXT NOT NULL,
    "tipoServicoId" TEXT NOT NULL,
    "faixaMetragemId" TEXT,
    "valorBase" DECIMAL(10,2) NOT NULL,
    "valorMobiliado" DECIMAL(10,2),
    "valorSemiMob" DECIMAL(10,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabelas_pagamento_vistoriador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fechamentos" (
    "id" TEXT NOT NULL,
    "mesReferencia" INTEGER NOT NULL,
    "anoReferencia" INTEGER NOT NULL,
    "status" "StatusFechamento" NOT NULL DEFAULT 'RASCUNHO',
    "dataImportacao" TIMESTAMP(3),
    "dataEnvioVist" TIMESTAMP(3),
    "dataEnvioImob" TIMESTAMP(3),
    "dataFinalizado" TIMESTAMP(3),
    "totalVistorias" INTEGER NOT NULL DEFAULT 0,
    "totalReceber" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPagar" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fechamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vistorias" (
    "id" TEXT NOT NULL,
    "fechamentoId" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "vistoriadorId" TEXT NOT NULL,
    "tipoServicoId" TEXT NOT NULL,
    "idKsi" TEXT NOT NULL,
    "numeroContrato" TEXT,
    "endereco" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "areaInformada" DOUBLE PRECISION,
    "areaAferida" DOUBLE PRECISION,
    "areaFaturar" DOUBLE PRECISION NOT NULL,
    "tipoMobilia" "TipoMobilia" NOT NULL DEFAULT 'NAO',
    "dataAgenda" TIMESTAMP(3),
    "dataFinalizado" TIMESTAMP(3),
    "valorServico" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorVistoriador" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "StatusVistoria" NOT NULL DEFAULT 'IMPORTADA',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vistorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contestacoes" (
    "id" TEXT NOT NULL,
    "vistoriaId" TEXT NOT NULL,
    "vistoriadorId" TEXT NOT NULL,
    "tipo" "TipoContestacao" NOT NULL,
    "descricao" TEXT NOT NULL,
    "areaContestada" DOUBLE PRECISION,
    "valorContestado" DECIMAL(10,2),
    "status" "StatusContestacao" NOT NULL DEFAULT 'PENDENTE',
    "respostaAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvidoAt" TIMESTAMP(3),
    "resolvidoPor" TEXT,

    CONSTRAINT "contestacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturas" (
    "id" TEXT NOT NULL,
    "fechamentoId" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "asaasPaymentId" TEXT,
    "asaasBoletoUrl" TEXT,
    "asaasPixQrCode" TEXT,
    "asaasPixCopiaECola" TEXT,
    "status" "StatusFatura" NOT NULL DEFAULT 'PENDENTE',
    "dataPagamento" TIMESTAMP(3),
    "valorPago" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos_vistoriador" (
    "id" TEXT NOT NULL,
    "fechamentoId" TEXT NOT NULL,
    "vistoriadorId" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "dataPrevista" TIMESTAMP(3) NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "dataPagamento" TIMESTAMP(3),
    "comprovante" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_vistoriador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "imobiliarias_nomeKsi_key" ON "imobiliarias"("nomeKsi");

-- CreateIndex
CREATE UNIQUE INDEX "imobiliarias_cnpj_key" ON "imobiliarias"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "vistoriadores_nomeKsi_key" ON "vistoriadores"("nomeKsi");

-- CreateIndex
CREATE UNIQUE INDEX "vistoriadores_cpf_key" ON "vistoriadores"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "vistoriadores_portalToken_key" ON "vistoriadores"("portalToken");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_servico_codigo_key" ON "tipos_servico"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tabelas_preco_imobiliariaId_tipoServicoId_faixaMetragemId_key" ON "tabelas_preco"("imobiliariaId", "tipoServicoId", "faixaMetragemId");

-- CreateIndex
CREATE UNIQUE INDEX "tabelas_pagamento_vistoriador_vistoriadorId_tipoServicoId_f_key" ON "tabelas_pagamento_vistoriador"("vistoriadorId", "tipoServicoId", "faixaMetragemId");

-- CreateIndex
CREATE UNIQUE INDEX "fechamentos_mesReferencia_anoReferencia_key" ON "fechamentos"("mesReferencia", "anoReferencia");

-- CreateIndex
CREATE INDEX "vistorias_fechamentoId_idx" ON "vistorias"("fechamentoId");

-- CreateIndex
CREATE INDEX "vistorias_imobiliariaId_idx" ON "vistorias"("imobiliariaId");

-- CreateIndex
CREATE INDEX "vistorias_vistoriadorId_idx" ON "vistorias"("vistoriadorId");

-- CreateIndex
CREATE UNIQUE INDEX "vistorias_fechamentoId_idKsi_key" ON "vistorias"("fechamentoId", "idKsi");

-- CreateIndex
CREATE INDEX "contestacoes_vistoriaId_idx" ON "contestacoes"("vistoriaId");

-- CreateIndex
CREATE INDEX "contestacoes_status_idx" ON "contestacoes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "faturas_numero_key" ON "faturas"("numero");

-- CreateIndex
CREATE INDEX "faturas_status_dataVencimento_idx" ON "faturas"("status", "dataVencimento");

-- CreateIndex
CREATE INDEX "faturas_fechamentoId_idx" ON "faturas"("fechamentoId");

-- CreateIndex
CREATE INDEX "faturas_imobiliariaId_idx" ON "faturas"("imobiliariaId");

-- CreateIndex
CREATE INDEX "pagamentos_vistoriador_fechamentoId_idx" ON "pagamentos_vistoriador"("fechamentoId");

-- CreateIndex
CREATE INDEX "pagamentos_vistoriador_vistoriadorId_idx" ON "pagamentos_vistoriador"("vistoriadorId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "tabelas_preco" ADD CONSTRAINT "tabelas_preco_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabelas_preco" ADD CONSTRAINT "tabelas_preco_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "tipos_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabelas_preco" ADD CONSTRAINT "tabelas_preco_faixaMetragemId_fkey" FOREIGN KEY ("faixaMetragemId") REFERENCES "faixas_metragem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabelas_pagamento_vistoriador" ADD CONSTRAINT "tabelas_pagamento_vistoriador_vistoriadorId_fkey" FOREIGN KEY ("vistoriadorId") REFERENCES "vistoriadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabelas_pagamento_vistoriador" ADD CONSTRAINT "tabelas_pagamento_vistoriador_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "tipos_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabelas_pagamento_vistoriador" ADD CONSTRAINT "tabelas_pagamento_vistoriador_faixaMetragemId_fkey" FOREIGN KEY ("faixaMetragemId") REFERENCES "faixas_metragem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_fechamentoId_fkey" FOREIGN KEY ("fechamentoId") REFERENCES "fechamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imobiliarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_vistoriadorId_fkey" FOREIGN KEY ("vistoriadorId") REFERENCES "vistoriadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "tipos_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contestacoes" ADD CONSTRAINT "contestacoes_vistoriaId_fkey" FOREIGN KEY ("vistoriaId") REFERENCES "vistorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contestacoes" ADD CONSTRAINT "contestacoes_vistoriadorId_fkey" FOREIGN KEY ("vistoriadorId") REFERENCES "vistoriadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_fechamentoId_fkey" FOREIGN KEY ("fechamentoId") REFERENCES "fechamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imobiliarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_vistoriador" ADD CONSTRAINT "pagamentos_vistoriador_fechamentoId_fkey" FOREIGN KEY ("fechamentoId") REFERENCES "fechamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_vistoriador" ADD CONSTRAINT "pagamentos_vistoriador_vistoriadorId_fkey" FOREIGN KEY ("vistoriadorId") REFERENCES "vistoriadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
