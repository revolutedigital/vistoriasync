import ExcelJS from 'exceljs';
import { prisma } from '../../../lib/prisma.js';
import { TipoMobilia } from '@prisma/client';

interface LinhaKSI {
  id: string;
  numeroContrato: string | null;
  cliente: string;
  vistoriadores: string;
  endereco: string;
  cidade: string;
  areaInformada: number | null;
  areaAferida: number | null;
  areaFaturar: number;
  mobiliado: string;
  tipoServico: string;
  dataAgenda: Date | null;
  dataFinalizado: Date | null;
}

interface ResultadoImportacao {
  total: number;
  importadas: number;
  erros: Array<{ linha: number; erro: string }>;
  imobiliariasNovas: string[];
  vistoriadoresNovos: string[];
}

export async function importarPlanilhaKSI(
  fechamentoId: string,
  buffer: Buffer,
  userId: string
): Promise<ResultadoImportacao> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('Planilha não encontrada no arquivo');
  }

  const resultado: ResultadoImportacao = {
    total: 0,
    importadas: 0,
    erros: [],
    imobiliariasNovas: [],
    vistoriadoresNovos: [],
  };

  // Mapear cabeçalhos
  const headers: Record<string, number> = {};
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const value = cell.value?.toString().toLowerCase().trim() || '';
    headers[value] = colNumber;
  });

  // Buscar/criar tipos de serviço
  const tiposServicoExistentes = await prisma.tipoServico.findMany();
  const tiposServicoMap = new Map(
    tiposServicoExistentes.map(t => [t.codigo.toLowerCase(), t])
  );

  // Cache de imobiliárias e vistoriadores
  const imobiliariasCache = new Map<string, string>();
  const vistoriadoresCache = new Map<string, string>();

  // Carregar existentes
  const imobiliarias = await prisma.imobiliaria.findMany();
  imobiliarias.forEach(i => imobiliariasCache.set(i.nomeKsi.toLowerCase(), i.id));

  const vistoriadores = await prisma.vistoriador.findMany();
  vistoriadores.forEach(v => vistoriadoresCache.set(v.nomeKsi.toLowerCase(), v.id));

  // Processar linhas
  const linhas: LinhaKSI[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Pular cabeçalho

    resultado.total++;

    try {
      const getCell = (name: string) => {
        const col = headers[name];
        return col ? row.getCell(col).value : null;
      };

      const getCellString = (name: string) => {
        const value = getCell(name);
        return value?.toString().trim() || '';
      };

      const getCellNumber = (name: string) => {
        const value = getCell(name);
        if (value === null || value === undefined || value === '') return null;
        const num = parseFloat(value.toString().replace(',', '.'));
        return isNaN(num) ? null : num;
      };

      const getCellDate = (name: string) => {
        const value = getCell(name);
        if (!value) return null;
        if (value instanceof Date) return value;
        const dateStr = value.toString();
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      const id = getCellString('id');
      if (!id) {
        resultado.erros.push({ linha: rowNumber, erro: 'ID não encontrado' });
        return;
      }

      const cliente = getCellString('cliente');
      if (!cliente) {
        resultado.erros.push({ linha: rowNumber, erro: 'Cliente não encontrado' });
        return;
      }

      const vistoriadorNome = getCellString('vistoriadores');
      if (!vistoriadorNome) {
        resultado.erros.push({ linha: rowNumber, erro: 'Vistoriador não encontrado' });
        return;
      }

      const endereco = getCellString('endereço') || getCellString('endereco');
      const cidade = getCellString('cidade') || extrairCidade(endereco);

      const linha: LinhaKSI = {
        id,
        numeroContrato: getCellString('n° contrato') || getCellString('contrato') || null,
        cliente,
        vistoriadores: vistoriadorNome,
        endereco,
        cidade,
        areaInformada: getCellNumber('área infor.') || getCellNumber('area informada'),
        areaAferida: getCellNumber('área aferida') || getCellNumber('area aferida'),
        areaFaturar: getCellNumber('área à faturar') || getCellNumber('area faturar') || getCellNumber('área aferida') || 0,
        mobiliado: getCellString('mobiliado'),
        tipoServico: getCellString('tipo serviço') || getCellString('tipo servico'),
        dataAgenda: getCellDate('data agenda'),
        dataFinalizado: getCellDate('data finalizado'),
      };

      linhas.push(linha);
    } catch (error) {
      resultado.erros.push({
        linha: rowNumber,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  });

  // Processar em transação
  await prisma.$transaction(async (tx) => {
    // Limpar vistorias existentes do fechamento
    await tx.vistoria.deleteMany({
      where: { fechamentoId },
    });

    for (const linha of linhas) {
      try {
        // Buscar/criar imobiliária
        let imobiliariaId = imobiliariasCache.get(linha.cliente.toLowerCase());
        if (!imobiliariaId) {
          const imobiliaria = await tx.imobiliaria.create({
            data: {
              nome: linha.cliente,
              nomeKsi: linha.cliente,
              cidade: linha.cidade || null,
            },
          });
          imobiliariaId = imobiliaria.id;
          imobiliariasCache.set(linha.cliente.toLowerCase(), imobiliariaId);
          resultado.imobiliariasNovas.push(linha.cliente);
        }

        // Buscar/criar vistoriador
        let vistoriadorId = vistoriadoresCache.get(linha.vistoriadores.toLowerCase());
        if (!vistoriadorId) {
          const vistoriador = await tx.vistoriador.create({
            data: {
              nome: linha.vistoriadores,
              nomeKsi: linha.vistoriadores,
              cidade: linha.cidade || null,
            },
          });
          vistoriadorId = vistoriador.id;
          vistoriadoresCache.set(linha.vistoriadores.toLowerCase(), vistoriadorId);
          resultado.vistoriadoresNovos.push(linha.vistoriadores);
        }

        // Buscar/criar tipo de serviço
        let tipoServico = tiposServicoMap.get(linha.tipoServico.toLowerCase());
        if (!tipoServico) {
          // Tentar extrair código do nome (ex: "1.0 - VISTORIA DE ENTRADA")
          const match = linha.tipoServico.match(/^(\d+\.?\d*)\s*[-–]\s*(.+)/);
          const codigo = match ? match[1] : linha.tipoServico.substring(0, 10);
          const nome = match ? match[2].trim() : linha.tipoServico;

          tipoServico = await tx.tipoServico.create({
            data: { codigo, nome },
          });
          tiposServicoMap.set(linha.tipoServico.toLowerCase(), tipoServico);
        }

        // Mapear tipo de mobília
        const tipoMobilia = mapearTipoMobilia(linha.mobiliado);

        // Criar vistoria
        await tx.vistoria.create({
          data: {
            fechamentoId,
            imobiliariaId,
            vistoriadorId,
            tipoServicoId: tipoServico.id,
            idKsi: linha.id,
            numeroContrato: linha.numeroContrato,
            endereco: linha.endereco,
            cidade: linha.cidade,
            areaInformada: linha.areaInformada,
            areaAferida: linha.areaAferida,
            areaFaturar: linha.areaFaturar || 0,
            tipoMobilia,
            dataAgenda: linha.dataAgenda,
            dataFinalizado: linha.dataFinalizado,
            status: 'IMPORTADA',
          },
        });

        resultado.importadas++;
      } catch (error) {
        resultado.erros.push({
          linha: linhas.indexOf(linha) + 2,
          erro: error instanceof Error ? error.message : 'Erro ao importar',
        });
      }
    }

    // Atualizar status do fechamento
    await tx.fechamento.update({
      where: { id: fechamentoId },
      data: {
        status: 'IMPORTADO',
        dataImportacao: new Date(),
        totalVistorias: resultado.importadas,
      },
    });
  });

  return resultado;
}

function extrairCidade(endereco: string): string {
  if (!endereco) return 'NÃO IDENTIFICADA';

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

function mapearTipoMobilia(valor: string): TipoMobilia {
  const normalizado = valor?.toUpperCase().trim() || '';

  if (normalizado === 'SIM' || normalizado === 'S' || normalizado === 'MOBILIADO') {
    return 'SIM';
  }

  if (normalizado === 'SEMI' || normalizado === 'SEMI-MOBILIADO' || normalizado === 'PARCIAL') {
    return 'SEMI';
  }

  return 'NAO';
}
