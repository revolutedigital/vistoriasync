import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Criar usuário admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pratesvistorias.com.br' },
    update: {},
    create: {
      email: 'admin@pratesvistorias.com.br',
      password: adminPassword,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Criar tipos de serviço
  const tiposServico = [
    { codigo: '1.0', nome: 'VISTORIA DE ENTRADA', descricao: 'Vistoria realizada na entrada do inquilino' },
    { codigo: '2.0', nome: 'VISTORIA DE SAÍDA', descricao: 'Vistoria realizada na saída do inquilino' },
    { codigo: '3.0', nome: 'VISTORIA DE CONFERÊNCIA', descricao: 'Vistoria de conferência de imóvel' },
    { codigo: '4.0', nome: 'VISTORIA CAUTELAR', descricao: 'Vistoria cautelar' },
    { codigo: '5.0', nome: 'LAUDO TÉCNICO', descricao: 'Elaboração de laudo técnico' },
  ];

  for (const tipo of tiposServico) {
    await prisma.tipoServico.upsert({
      where: { codigo: tipo.codigo },
      update: {},
      create: tipo,
    });
  }
  console.log('✅ Tipos de serviço criados');

  // Criar faixas de metragem
  const faixas = [
    { id: 'faixa-1', nome: 'Até 150 m²', metrosMin: 0, metrosMax: 150, multiplicador: 1.0, ordem: 1 },
    { id: 'faixa-2', nome: '151 até 225 m²', metrosMin: 151, metrosMax: 225, multiplicador: 1.5, ordem: 2 },
    { id: 'faixa-3', nome: '226 até 300 m²', metrosMin: 226, metrosMax: 300, multiplicador: 2.0, ordem: 3 },
    { id: 'faixa-4', nome: '301 até 375 m²', metrosMin: 301, metrosMax: 375, multiplicador: 2.5, ordem: 4 },
    { id: 'faixa-5', nome: '376 até 450 m²', metrosMin: 376, metrosMax: 450, multiplicador: 3.0, ordem: 5 },
    { id: 'faixa-6', nome: '451 até 525 m²', metrosMin: 451, metrosMax: 525, multiplicador: 3.5, ordem: 6 },
    { id: 'faixa-7', nome: '526 até 600 m²', metrosMin: 526, metrosMax: 600, multiplicador: 4.0, ordem: 7 },
    { id: 'faixa-8', nome: 'Acima de 600 m²', metrosMin: 601, metrosMax: 999999, multiplicador: 5.0, ordem: 8 },
  ];

  for (const faixa of faixas) {
    const existing = await prisma.faixaMetragem.findUnique({ where: { id: faixa.id } });
    if (!existing) {
      await prisma.faixaMetragem.create({ data: faixa });
    }
  }
  console.log('✅ Faixas de metragem criadas');

  // Criar algumas imobiliárias de exemplo
  const imobiliarias = [
    { nome: 'Imobiliária Central', nomeKsi: 'IMOBILIARIA CENTRAL', cidade: 'São Paulo', diaPagamento: 10 },
    { nome: 'Imóveis Plus', nomeKsi: 'IMOVEIS PLUS', cidade: 'Campinas', diaPagamento: 15 },
    { nome: 'Casa Nova Imóveis', nomeKsi: 'CASA NOVA IMOVEIS', cidade: 'Santos', diaPagamento: 12 },
  ];

  const tipoEntrada = await prisma.tipoServico.findFirst({ where: { codigo: '1.0' } });
  const tipoSaida = await prisma.tipoServico.findFirst({ where: { codigo: '2.0' } });
  const faixaPadrao = await prisma.faixaMetragem.findFirst({ where: { id: 'faixa-1' } });

  for (const imob of imobiliarias) {
    const existing = await prisma.imobiliaria.findUnique({ where: { nomeKsi: imob.nomeKsi } });
    const created = existing || await prisma.imobiliaria.create({ data: imob });

    // Criar tabela de preços padrão (com faixa padrão para evitar null)
    if (tipoEntrada && faixaPadrao) {
      const existingPreco = await prisma.tabelaPreco.findFirst({
        where: {
          imobiliariaId: created.id,
          tipoServicoId: tipoEntrada.id,
        },
      });
      if (!existingPreco) {
        await prisma.tabelaPreco.create({
          data: {
            imobiliariaId: created.id,
            tipoServicoId: tipoEntrada.id,
            faixaMetragemId: faixaPadrao.id,
            valorBase: 150.00,
            valorMobiliado: 30.00,
            valorSemiMob: 15.00,
          },
        });
      }
    }

    if (tipoSaida && faixaPadrao) {
      const existingPreco = await prisma.tabelaPreco.findFirst({
        where: {
          imobiliariaId: created.id,
          tipoServicoId: tipoSaida.id,
        },
      });
      if (!existingPreco) {
        await prisma.tabelaPreco.create({
          data: {
            imobiliariaId: created.id,
            tipoServicoId: tipoSaida.id,
            faixaMetragemId: faixaPadrao.id,
            valorBase: 180.00,
            valorMobiliado: 40.00,
            valorSemiMob: 20.00,
          },
        });
      }
    }
  }
  console.log('✅ Imobiliárias de exemplo criadas');

  // Criar alguns vistoriadores de exemplo
  const vistoriadores = [
    { nome: 'João Silva', nomeKsi: 'JOAO SILVA', cidade: 'São Paulo', chavePix: 'joao@email.com' },
    { nome: 'Maria Santos', nomeKsi: 'MARIA SANTOS', cidade: 'Campinas', chavePix: '11999999999' },
    { nome: 'Carlos Oliveira', nomeKsi: 'CARLOS OLIVEIRA', cidade: 'Santos', chavePix: '123.456.789-00' },
  ];

  for (const vist of vistoriadores) {
    const existing = await prisma.vistoriador.findUnique({ where: { nomeKsi: vist.nomeKsi } });
    const created = existing || await prisma.vistoriador.create({ data: vist });

    // Criar tabela de pagamentos padrão
    if (tipoEntrada && faixaPadrao) {
      const existingPag = await prisma.tabelaPagamentoVistoriador.findFirst({
        where: {
          vistoriadorId: created.id,
          tipoServicoId: tipoEntrada.id,
        },
      });
      if (!existingPag) {
        await prisma.tabelaPagamentoVistoriador.create({
          data: {
            vistoriadorId: created.id,
            tipoServicoId: tipoEntrada.id,
            faixaMetragemId: faixaPadrao.id,
            valorBase: 80.00,
            valorMobiliado: 15.00,
            valorSemiMob: 8.00,
          },
        });
      }
    }

    if (tipoSaida && faixaPadrao) {
      const existingPag = await prisma.tabelaPagamentoVistoriador.findFirst({
        where: {
          vistoriadorId: created.id,
          tipoServicoId: tipoSaida.id,
        },
      });
      if (!existingPag) {
        await prisma.tabelaPagamentoVistoriador.create({
          data: {
            vistoriadorId: created.id,
            tipoServicoId: tipoSaida.id,
            faixaMetragemId: faixaPadrao.id,
            valorBase: 100.00,
            valorMobiliado: 20.00,
            valorSemiMob: 10.00,
          },
        });
      }
    }
  }
  console.log('✅ Vistoriadores de exemplo criados');

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
