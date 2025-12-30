import ExcelJS from 'exceljs';
import { prisma } from '../../../lib/prisma.js';

export async function exportarContasReceber(fechamentoId: string): Promise<Buffer> {
  const fechamento = await prisma.fechamento.findUnique({
    where: { id: fechamentoId },
  });

  if (!fechamento) {
    throw new Error('Fechamento não encontrado');
  }

  // Agrupar vistorias por imobiliária
  const vistorias = await prisma.vistoria.findMany({
    where: {
      fechamentoId,
      status: { in: ['CALCULADA', 'APROVADA', 'FATURADA'] },
    },
    include: {
      imobiliaria: true,
      tipoServico: true,
    },
    orderBy: [
      { imobiliaria: { nome: 'asc' } },
      { createdAt: 'asc' },
    ],
  });

  // Agrupar por imobiliária
  const porImobiliaria = vistorias.reduce((acc, v) => {
    if (!acc[v.imobiliariaId]) {
      acc[v.imobiliariaId] = {
        imobiliaria: v.imobiliaria,
        vistorias: [],
        total: 0,
      };
    }
    acc[v.imobiliariaId].vistorias.push(v);
    acc[v.imobiliariaId].total += Number(v.valorServico);
    return acc;
  }, {} as Record<string, { imobiliaria: any; vistorias: any[]; total: number }>);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VistoriaSync';
  workbook.created = new Date();

  // Planilha resumo
  const resumoSheet = workbook.addWorksheet('Resumo');
  resumoSheet.columns = [
    { header: 'Cliente', key: 'cliente', width: 40 },
    { header: 'CNPJ', key: 'cnpj', width: 20 },
    { header: 'Qtd Vistorias', key: 'qtd', width: 15 },
    { header: 'Valor Total', key: 'valor', width: 20 },
    { header: 'Vencimento', key: 'vencimento', width: 15 },
    { header: 'Forma Pagamento', key: 'forma', width: 18 },
    { header: 'Referência', key: 'referencia', width: 25 },
  ];

  // Estilo do cabeçalho
  resumoSheet.getRow(1).font = { bold: true };
  resumoSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  resumoSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  Object.values(porImobiliaria).forEach(dados => {
    // Calcular vencimento
    const vencimento = calcularVencimento(
      fechamento.mesReferencia,
      fechamento.anoReferencia,
      dados.imobiliaria.diaPagamento
    );

    resumoSheet.addRow({
      cliente: dados.imobiliaria.nome,
      cnpj: dados.imobiliaria.cnpj || '-',
      qtd: dados.vistorias.length,
      valor: dados.total,
      vencimento,
      forma: dados.imobiliaria.formaPagamento,
      referencia: `Vistorias ${fechamento.mesReferencia.toString().padStart(2, '0')}/${fechamento.anoReferencia}`,
    });
  });

  // Formatar coluna de valor
  resumoSheet.getColumn('valor').numFmt = 'R$ #,##0.00';

  // Linha de total
  const totalGeral = Object.values(porImobiliaria).reduce((acc, d) => acc + d.total, 0);
  const totalRow = resumoSheet.addRow({
    cliente: 'TOTAL GERAL',
    qtd: vistorias.length,
    valor: totalGeral,
  });
  totalRow.font = { bold: true };

  // Planilha detalhada
  const detalhesSheet = workbook.addWorksheet('Detalhes');
  detalhesSheet.columns = [
    { header: 'Cliente', key: 'cliente', width: 35 },
    { header: 'ID KSI', key: 'idKsi', width: 12 },
    { header: 'Endereço', key: 'endereco', width: 45 },
    { header: 'Cidade', key: 'cidade', width: 20 },
    { header: 'Tipo Serviço', key: 'tipoServico', width: 25 },
    { header: 'Área (m²)', key: 'area', width: 12 },
    { header: 'Mobiliado', key: 'mobiliado', width: 12 },
    { header: 'Valor', key: 'valor', width: 15 },
  ];

  detalhesSheet.getRow(1).font = { bold: true };
  detalhesSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  detalhesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  vistorias.forEach(v => {
    detalhesSheet.addRow({
      cliente: v.imobiliaria.nome,
      idKsi: v.idKsi,
      endereco: v.endereco,
      cidade: v.cidade,
      tipoServico: v.tipoServico.nome,
      area: v.areaFaturar,
      mobiliado: v.tipoMobilia === 'SIM' ? 'Sim' : v.tipoMobilia === 'SEMI' ? 'Semi' : 'Não',
      valor: Number(v.valorServico),
    });
  });

  detalhesSheet.getColumn('valor').numFmt = 'R$ #,##0.00';

  // Formato para importação Flow
  const flowSheet = workbook.addWorksheet('Flow Import');
  flowSheet.columns = [
    { header: 'Cliente', key: 'cliente', width: 40 },
    { header: 'Valor', key: 'valor', width: 15 },
    { header: 'Vencimento', key: 'vencimento', width: 15 },
    { header: 'Forma Pagamento', key: 'forma', width: 15 },
    { header: 'Descrição', key: 'descricao', width: 40 },
    { header: 'Centro de Custo', key: 'centroCusto', width: 20 },
  ];

  flowSheet.getRow(1).font = { bold: true };

  Object.values(porImobiliaria).forEach(dados => {
    const vencimento = calcularVencimento(
      fechamento.mesReferencia,
      fechamento.anoReferencia,
      dados.imobiliaria.diaPagamento
    );

    flowSheet.addRow({
      cliente: dados.imobiliaria.nome,
      valor: dados.total,
      vencimento: vencimento.toISOString().split('T')[0],
      forma: dados.imobiliaria.formaPagamento,
      descricao: `Vistorias ref. ${fechamento.mesReferencia.toString().padStart(2, '0')}/${fechamento.anoReferencia}`,
      centroCusto: 'Vistorias',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function exportarContasPagar(fechamentoId: string): Promise<Buffer> {
  const fechamento = await prisma.fechamento.findUnique({
    where: { id: fechamentoId },
  });

  if (!fechamento) {
    throw new Error('Fechamento não encontrado');
  }

  // Agrupar vistorias por vistoriador
  const vistorias = await prisma.vistoria.findMany({
    where: {
      fechamentoId,
      status: { in: ['CALCULADA', 'APROVADA', 'FATURADA'] },
    },
    include: {
      vistoriador: true,
      imobiliaria: true,
      tipoServico: true,
    },
    orderBy: [
      { vistoriador: { nome: 'asc' } },
      { createdAt: 'asc' },
    ],
  });

  // Agrupar por vistoriador
  const porVistoriador = vistorias.reduce((acc, v) => {
    if (!acc[v.vistoriadorId]) {
      acc[v.vistoriadorId] = {
        vistoriador: v.vistoriador,
        vistorias: [],
        total: 0,
      };
    }
    acc[v.vistoriadorId].vistorias.push(v);
    acc[v.vistoriadorId].total += Number(v.valorVistoriador);
    return acc;
  }, {} as Record<string, { vistoriador: any; vistorias: any[]; total: number }>);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VistoriaSync';
  workbook.created = new Date();

  // Planilha resumo
  const resumoSheet = workbook.addWorksheet('Resumo');
  resumoSheet.columns = [
    { header: 'Vistoriador', key: 'vistoriador', width: 35 },
    { header: 'CPF', key: 'cpf', width: 15 },
    { header: 'Qtd Vistorias', key: 'qtd', width: 15 },
    { header: 'Valor Total', key: 'valor', width: 18 },
    { header: 'Chave PIX', key: 'pix', width: 30 },
    { header: 'Referência', key: 'referencia', width: 25 },
  ];

  resumoSheet.getRow(1).font = { bold: true };
  resumoSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' },
  };
  resumoSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  Object.values(porVistoriador).forEach(dados => {
    resumoSheet.addRow({
      vistoriador: dados.vistoriador.nome,
      cpf: dados.vistoriador.cpf || '-',
      qtd: dados.vistorias.length,
      valor: dados.total,
      pix: dados.vistoriador.chavePix || '-',
      referencia: `Vistorias ${fechamento.mesReferencia.toString().padStart(2, '0')}/${fechamento.anoReferencia}`,
    });
  });

  resumoSheet.getColumn('valor').numFmt = 'R$ #,##0.00';

  // Linha de total
  const totalGeral = Object.values(porVistoriador).reduce((acc, d) => acc + d.total, 0);
  const totalRow = resumoSheet.addRow({
    vistoriador: 'TOTAL GERAL',
    qtd: vistorias.length,
    valor: totalGeral,
  });
  totalRow.font = { bold: true };

  // Planilha detalhada
  const detalhesSheet = workbook.addWorksheet('Detalhes');
  detalhesSheet.columns = [
    { header: 'Vistoriador', key: 'vistoriador', width: 30 },
    { header: 'Cliente', key: 'cliente', width: 30 },
    { header: 'ID KSI', key: 'idKsi', width: 12 },
    { header: 'Endereço', key: 'endereco', width: 40 },
    { header: 'Cidade', key: 'cidade', width: 18 },
    { header: 'Tipo Serviço', key: 'tipoServico', width: 22 },
    { header: 'Área (m²)', key: 'area', width: 12 },
    { header: 'Mobiliado', key: 'mobiliado', width: 12 },
    { header: 'Valor', key: 'valor', width: 15 },
  ];

  detalhesSheet.getRow(1).font = { bold: true };
  detalhesSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' },
  };
  detalhesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  vistorias.forEach(v => {
    detalhesSheet.addRow({
      vistoriador: v.vistoriador.nome,
      cliente: v.imobiliaria.nome,
      idKsi: v.idKsi,
      endereco: v.endereco,
      cidade: v.cidade,
      tipoServico: v.tipoServico.nome,
      area: v.areaFaturar,
      mobiliado: v.tipoMobilia === 'SIM' ? 'Sim' : v.tipoMobilia === 'SEMI' ? 'Semi' : 'Não',
      valor: Number(v.valorVistoriador),
    });
  });

  detalhesSheet.getColumn('valor').numFmt = 'R$ #,##0.00';

  // Formato para importação Flow
  const flowSheet = workbook.addWorksheet('Flow Import');
  flowSheet.columns = [
    { header: 'Fornecedor', key: 'fornecedor', width: 35 },
    { header: 'CPF', key: 'cpf', width: 15 },
    { header: 'Valor', key: 'valor', width: 15 },
    { header: 'Data Pagamento', key: 'dataPagamento', width: 15 },
    { header: 'Chave PIX', key: 'pix', width: 30 },
    { header: 'Descrição', key: 'descricao', width: 40 },
    { header: 'Centro de Custo', key: 'centroCusto', width: 20 },
  ];

  flowSheet.getRow(1).font = { bold: true };

  // Data de pagamento: dia 20 do mês seguinte
  const dataPagamento = new Date(
    fechamento.anoReferencia,
    fechamento.mesReferencia, // Mês seguinte (JS é 0-indexed)
    20
  );

  Object.values(porVistoriador).forEach(dados => {
    flowSheet.addRow({
      fornecedor: dados.vistoriador.nome,
      cpf: dados.vistoriador.cpf || '',
      valor: dados.total,
      dataPagamento: dataPagamento.toISOString().split('T')[0],
      pix: dados.vistoriador.chavePix || '',
      descricao: `Vistorias ref. ${fechamento.mesReferencia.toString().padStart(2, '0')}/${fechamento.anoReferencia}`,
      centroCusto: 'Vistoriadores',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function calcularVencimento(mes: number, ano: number, diaPagamento: number): Date {
  // Vencimento é no mês seguinte
  let mesVencimento = mes + 1;
  let anoVencimento = ano;

  if (mesVencimento > 12) {
    mesVencimento = 1;
    anoVencimento++;
  }

  // Ajustar dia se for maior que o último dia do mês
  const ultimoDia = new Date(anoVencimento, mesVencimento, 0).getDate();
  const dia = Math.min(diaPagamento, ultimoDia);

  return new Date(anoVencimento, mesVencimento - 1, dia);
}
