import { Decimal } from 'decimal.js';
import { prisma } from '../../../lib/prisma.js';
import { TipoMobilia } from '@prisma/client';

interface ResultadoCalculo {
  totalVistorias: number;
  totalReceber: number;
  totalPagar: number;
  calculadas: number;
  erros: Array<{ vistoriaId: string; erro: string }>;
}

export async function calcularValoresFechamento(
  fechamentoId: string
): Promise<ResultadoCalculo> {
  const resultado: ResultadoCalculo = {
    totalVistorias: 0,
    totalReceber: 0,
    totalPagar: 0,
    calculadas: 0,
    erros: [],
  };

  // Buscar todas as vistorias do fechamento
  const vistorias = await prisma.vistoria.findMany({
    where: { fechamentoId },
    include: {
      imobiliaria: true,
      vistoriador: true,
      tipoServico: true,
    },
  });

  resultado.totalVistorias = vistorias.length;

  // Buscar faixas de metragem
  const faixas = await prisma.faixaMetragem.findMany({
    orderBy: { ordem: 'asc' },
  });

  // Cache de tabelas de preço e pagamento
  const tabelaPrecoCache = new Map<string, any>();
  const tabelaPagamentoCache = new Map<string, any>();

  // Carregar todas as tabelas de preço relevantes
  const imobiliariaIds = [...new Set(vistorias.map(v => v.imobiliariaId))];
  const vistoriadorIds = [...new Set(vistorias.map(v => v.vistoriadorId))];
  const tipoServicoIds = [...new Set(vistorias.map(v => v.tipoServicoId))];

  const tabelasPreco = await prisma.tabelaPreco.findMany({
    where: {
      imobiliariaId: { in: imobiliariaIds },
      tipoServicoId: { in: tipoServicoIds },
      ativo: true,
    },
    include: {
      faixaMetragem: true,
    },
  });

  tabelasPreco.forEach(tp => {
    const key = `${tp.imobiliariaId}:${tp.tipoServicoId}:${tp.faixaMetragemId || 'default'}`;
    tabelaPrecoCache.set(key, tp);
  });

  const tabelasPagamento = await prisma.tabelaPagamentoVistoriador.findMany({
    where: {
      vistoriadorId: { in: vistoriadorIds },
      tipoServicoId: { in: tipoServicoIds },
      ativo: true,
    },
    include: {
      faixaMetragem: true,
    },
  });

  tabelasPagamento.forEach(tp => {
    const key = `${tp.vistoriadorId}:${tp.tipoServicoId}:${tp.faixaMetragemId || 'default'}`;
    tabelaPagamentoCache.set(key, tp);
  });

  // Calcular valores para cada vistoria
  for (const vistoria of vistorias) {
    try {
      const area = vistoria.areaFaturar;

      // Encontrar faixa de metragem
      const faixa = faixas.find(f => area >= f.metrosMin && area <= f.metrosMax);
      const multiplicador = faixa?.multiplicador || 1;

      // Buscar tabela de preço
      let tabelaPreco = tabelaPrecoCache.get(
        `${vistoria.imobiliariaId}:${vistoria.tipoServicoId}:${faixa?.id || 'default'}`
      );

      // Fallback para tabela sem faixa
      if (!tabelaPreco) {
        tabelaPreco = tabelaPrecoCache.get(
          `${vistoria.imobiliariaId}:${vistoria.tipoServicoId}:default`
        );
      }

      // Calcular valor do serviço
      let valorServico = new Decimal(0);

      if (tabelaPreco) {
        valorServico = new Decimal(tabelaPreco.valorBase).mul(multiplicador);

        // Adicionar valor mobiliado
        if (vistoria.tipoMobilia === 'SIM' && tabelaPreco.valorMobiliado) {
          valorServico = valorServico.add(new Decimal(tabelaPreco.valorMobiliado));
        } else if (vistoria.tipoMobilia === 'SEMI' && tabelaPreco.valorSemiMob) {
          valorServico = valorServico.add(new Decimal(tabelaPreco.valorSemiMob));
        }
      }

      // Buscar tabela de pagamento do vistoriador
      let tabelaPagamento = tabelaPagamentoCache.get(
        `${vistoria.vistoriadorId}:${vistoria.tipoServicoId}:${faixa?.id || 'default'}`
      );

      // Fallback para tabela sem faixa
      if (!tabelaPagamento) {
        tabelaPagamento = tabelaPagamentoCache.get(
          `${vistoria.vistoriadorId}:${vistoria.tipoServicoId}:default`
        );
      }

      // Calcular valor do vistoriador
      let valorVistoriador = new Decimal(0);

      if (tabelaPagamento) {
        valorVistoriador = new Decimal(tabelaPagamento.valorBase).mul(multiplicador);

        // Adicionar valor mobiliado
        if (vistoria.tipoMobilia === 'SIM' && tabelaPagamento.valorMobiliado) {
          valorVistoriador = valorVistoriador.add(new Decimal(tabelaPagamento.valorMobiliado));
        } else if (vistoria.tipoMobilia === 'SEMI' && tabelaPagamento.valorSemiMob) {
          valorVistoriador = valorVistoriador.add(new Decimal(tabelaPagamento.valorSemiMob));
        }
      }

      // Atualizar vistoria
      await prisma.vistoria.update({
        where: { id: vistoria.id },
        data: {
          valorServico: valorServico.toNumber(),
          valorVistoriador: valorVistoriador.toNumber(),
          status: 'CALCULADA',
        },
      });

      resultado.totalReceber += valorServico.toNumber();
      resultado.totalPagar += valorVistoriador.toNumber();
      resultado.calculadas++;

    } catch (error) {
      resultado.erros.push({
        vistoriaId: vistoria.id,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Atualizar fechamento
  await prisma.fechamento.update({
    where: { id: fechamentoId },
    data: {
      status: 'CALCULADO',
      totalReceber: resultado.totalReceber,
      totalPagar: resultado.totalPagar,
    },
  });

  return resultado;
}

// Recalcular uma única vistoria
export async function recalcularVistoria(vistoriaId: string) {
  const vistoria = await prisma.vistoria.findUnique({
    where: { id: vistoriaId },
    include: {
      imobiliaria: true,
      vistoriador: true,
      tipoServico: true,
    },
  });

  if (!vistoria) {
    throw new Error('Vistoria não encontrada');
  }

  const faixas = await prisma.faixaMetragem.findMany({
    orderBy: { ordem: 'asc' },
  });

  const area = vistoria.areaFaturar;
  const faixa = faixas.find(f => area >= f.metrosMin && area <= f.metrosMax);
  const multiplicador = faixa?.multiplicador || 1;

  // Buscar tabela de preço
  let tabelaPreco = await prisma.tabelaPreco.findFirst({
    where: {
      imobiliariaId: vistoria.imobiliariaId,
      tipoServicoId: vistoria.tipoServicoId,
      faixaMetragemId: faixa?.id,
      ativo: true,
    },
  });

  if (!tabelaPreco) {
    tabelaPreco = await prisma.tabelaPreco.findFirst({
      where: {
        imobiliariaId: vistoria.imobiliariaId,
        tipoServicoId: vistoria.tipoServicoId,
        faixaMetragemId: null,
        ativo: true,
      },
    });
  }

  // Calcular valor do serviço
  let valorServico = new Decimal(0);

  if (tabelaPreco) {
    valorServico = new Decimal(tabelaPreco.valorBase).mul(multiplicador);

    if (vistoria.tipoMobilia === 'SIM' && tabelaPreco.valorMobiliado) {
      valorServico = valorServico.add(new Decimal(tabelaPreco.valorMobiliado));
    } else if (vistoria.tipoMobilia === 'SEMI' && tabelaPreco.valorSemiMob) {
      valorServico = valorServico.add(new Decimal(tabelaPreco.valorSemiMob));
    }
  }

  // Buscar tabela de pagamento
  let tabelaPagamento = await prisma.tabelaPagamentoVistoriador.findFirst({
    where: {
      vistoriadorId: vistoria.vistoriadorId,
      tipoServicoId: vistoria.tipoServicoId,
      faixaMetragemId: faixa?.id,
      ativo: true,
    },
  });

  if (!tabelaPagamento) {
    tabelaPagamento = await prisma.tabelaPagamentoVistoriador.findFirst({
      where: {
        vistoriadorId: vistoria.vistoriadorId,
        tipoServicoId: vistoria.tipoServicoId,
        faixaMetragemId: null,
        ativo: true,
      },
    });
  }

  // Calcular valor do vistoriador
  let valorVistoriador = new Decimal(0);

  if (tabelaPagamento) {
    valorVistoriador = new Decimal(tabelaPagamento.valorBase).mul(multiplicador);

    if (vistoria.tipoMobilia === 'SIM' && tabelaPagamento.valorMobiliado) {
      valorVistoriador = valorVistoriador.add(new Decimal(tabelaPagamento.valorMobiliado));
    } else if (vistoria.tipoMobilia === 'SEMI' && tabelaPagamento.valorSemiMob) {
      valorVistoriador = valorVistoriador.add(new Decimal(tabelaPagamento.valorSemiMob));
    }
  }

  // Atualizar vistoria
  const updated = await prisma.vistoria.update({
    where: { id: vistoriaId },
    data: {
      valorServico: valorServico.toNumber(),
      valorVistoriador: valorVistoriador.toNumber(),
      status: 'CALCULADA',
    },
  });

  // Atualizar totais do fechamento
  const totais = await prisma.vistoria.aggregate({
    where: { fechamentoId: vistoria.fechamentoId },
    _sum: {
      valorServico: true,
      valorVistoriador: true,
    },
  });

  await prisma.fechamento.update({
    where: { id: vistoria.fechamentoId },
    data: {
      totalReceber: totais._sum.valorServico || 0,
      totalPagar: totais._sum.valorVistoriador || 0,
    },
  });

  return updated;
}
