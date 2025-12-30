import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, AppError } from '../../utils/errors.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { paginationSchema, paginate, getPrismaSkipTake } from '../../utils/pagination.js';
import { importarPlanilhaKSI } from './services/importacao.service.js';
import { calcularValoresFechamento } from './services/calculo.service.js';
import { exportarContasReceber, exportarContasPagar } from './services/exportacao.service.js';

const createSchema = z.object({
  mesReferencia: z.number().min(1).max(12),
  anoReferencia: z.number().min(2020).max(2100),
});

const querySchema = z.object({
  ano: z.coerce.number().optional(),
  status: z.string().optional(),
}).merge(paginationSchema);

export async function fechamentosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // Listar fechamentos
  app.get('/', async (request, reply) => {
    const query = querySchema.parse(request.query);
    const { skip, take } = getPrismaSkipTake(query);

    const where: any = {};

    if (query.ano) {
      where.anoReferencia = query.ano;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      prisma.fechamento.findMany({
        where,
        skip,
        take,
        orderBy: [
          { anoReferencia: 'desc' },
          { mesReferencia: 'desc' },
        ],
        include: {
          _count: {
            select: {
              vistorias: true,
              faturas: true,
            },
          },
        },
      }),
      prisma.fechamento.count({ where }),
    ]);

    return reply.send({
      success: true,
      ...paginate(data, total, query),
    });
  });

  // Buscar fechamento por ID
  app.get('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const fechamento = await prisma.fechamento.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vistorias: true,
            faturas: true,
            pagamentos: true,
          },
        },
      },
    });

    if (!fechamento) {
      throw new NotFoundError('Fechamento');
    }

    return reply.send({
      success: true,
      data: fechamento,
    });
  });

  // Criar novo fechamento
  app.post('/', async (request, reply) => {
    const data = createSchema.parse(request.body);

    // Verificar se já existe fechamento para o período
    const existing = await prisma.fechamento.findUnique({
      where: {
        mesReferencia_anoReferencia: {
          mesReferencia: data.mesReferencia,
          anoReferencia: data.anoReferencia,
        },
      },
    });

    if (existing) {
      throw new AppError(
        `Já existe um fechamento para ${data.mesReferencia}/${data.anoReferencia}`,
        409
      );
    }

    const fechamento = await prisma.fechamento.create({
      data,
    });

    return reply.status(201).send({
      success: true,
      data: fechamento,
    });
  });

  // Atualizar fechamento
  app.patch('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const updateSchema = z.object({
      status: z.enum([
        'RASCUNHO', 'IMPORTADO', 'CALCULADO', 'AGUARDANDO_VISTORIADORES',
        'EM_REVISAO', 'AGUARDANDO_IMOBILIARIAS', 'FATURADO', 'FINALIZADO'
      ]).optional(),
    });

    const data = updateSchema.parse(request.body);

    const fechamento = await prisma.fechamento.update({
      where: { id },
      data,
    });

    return reply.send({
      success: true,
      data: fechamento,
    });
  });

  // Deletar fechamento
  app.delete('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const fechamento = await prisma.fechamento.findUnique({
      where: { id },
    });

    if (!fechamento) {
      throw new NotFoundError('Fechamento');
    }

    if (fechamento.status !== 'RASCUNHO') {
      throw new AppError('Apenas fechamentos em rascunho podem ser excluídos');
    }

    await prisma.fechamento.delete({
      where: { id },
    });

    return reply.send({
      success: true,
      message: 'Fechamento excluído com sucesso',
    });
  });

  // Importar planilha KSI
  app.post('/:id/importar', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const fechamento = await prisma.fechamento.findUnique({
      where: { id },
    });

    if (!fechamento) {
      throw new NotFoundError('Fechamento');
    }

    if (!['RASCUNHO', 'IMPORTADO'].includes(fechamento.status)) {
      throw new AppError('Fechamento não pode receber importação neste status');
    }

    const file = await request.file();

    if (!file) {
      throw new AppError('Arquivo não enviado');
    }

    const buffer = await file.toBuffer();
    const resultado = await importarPlanilhaKSI(id, buffer, request.user.sub);

    return reply.send({
      success: true,
      data: resultado,
    });
  });

  // Calcular valores do fechamento
  app.post('/:id/calcular', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const fechamento = await prisma.fechamento.findUnique({
      where: { id },
    });

    if (!fechamento) {
      throw new NotFoundError('Fechamento');
    }

    if (!['IMPORTADO', 'CALCULADO'].includes(fechamento.status)) {
      throw new AppError('Fechamento precisa estar importado para calcular');
    }

    const resultado = await calcularValoresFechamento(id);

    return reply.send({
      success: true,
      data: resultado,
    });
  });

  // Resumo do fechamento
  app.get('/:id/resumo', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const fechamento = await prisma.fechamento.findUnique({
      where: { id },
      include: {
        vistorias: {
          select: {
            id: true,
            valorServico: true,
            valorVistoriador: true,
            status: true,
          },
        },
      },
    });

    if (!fechamento) {
      throw new NotFoundError('Fechamento');
    }

    // Agrupar por imobiliária
    const porImobiliaria = await prisma.vistoria.groupBy({
      by: ['imobiliariaId'],
      where: { fechamentoId: id },
      _count: { id: true },
      _sum: { valorServico: true },
    });

    // Agrupar por vistoriador
    const porVistoriador = await prisma.vistoria.groupBy({
      by: ['vistoriadorId'],
      where: { fechamentoId: id },
      _count: { id: true },
      _sum: { valorVistoriador: true },
    });

    // Agrupar por status
    const porStatus = await prisma.vistoria.groupBy({
      by: ['status'],
      where: { fechamentoId: id },
      _count: { id: true },
    });

    // Buscar nomes
    const imobiliarias = await prisma.imobiliaria.findMany({
      where: { id: { in: porImobiliaria.map(i => i.imobiliariaId) } },
      select: { id: true, nome: true },
    });

    const vistoriadores = await prisma.vistoriador.findMany({
      where: { id: { in: porVistoriador.map(v => v.vistoriadorId) } },
      select: { id: true, nome: true },
    });

    return reply.send({
      success: true,
      data: {
        fechamento: {
          id: fechamento.id,
          mesReferencia: fechamento.mesReferencia,
          anoReferencia: fechamento.anoReferencia,
          status: fechamento.status,
          totalVistorias: fechamento.totalVistorias,
          totalReceber: fechamento.totalReceber,
          totalPagar: fechamento.totalPagar,
        },
        porImobiliaria: porImobiliaria.map(i => ({
          ...i,
          nome: imobiliarias.find(im => im.id === i.imobiliariaId)?.nome || 'N/A',
        })),
        porVistoriador: porVistoriador.map(v => ({
          ...v,
          nome: vistoriadores.find(vs => vs.id === v.vistoriadorId)?.nome || 'N/A',
        })),
        porStatus,
      },
    });
  });

  // Listar vistorias do fechamento
  app.get('/:id/vistorias', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const querySchema = z.object({
      imobiliariaId: z.string().optional(),
      vistoriadorId: z.string().optional(),
      status: z.string().optional(),
      cidade: z.string().optional(),
    }).merge(paginationSchema);

    const query = querySchema.parse(request.query);
    const { skip, take } = getPrismaSkipTake(query);

    const where: any = { fechamentoId: id };

    if (query.imobiliariaId) where.imobiliariaId = query.imobiliariaId;
    if (query.vistoriadorId) where.vistoriadorId = query.vistoriadorId;
    if (query.status) where.status = query.status;
    if (query.cidade) where.cidade = { contains: query.cidade, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.vistoria.findMany({
        where,
        skip,
        take,
        include: {
          imobiliaria: { select: { id: true, nome: true } },
          vistoriador: { select: { id: true, nome: true } },
          tipoServico: { select: { id: true, codigo: true, nome: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vistoria.count({ where }),
    ]);

    return reply.send({
      success: true,
      ...paginate(data, total, query),
    });
  });

  // Exportar contas a receber
  app.get('/:id/exportar/receber', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const fechamento = await prisma.fechamento.findUnique({
      where: { id },
    });

    if (!fechamento) {
      throw new NotFoundError('Fechamento');
    }

    const buffer = await exportarContasReceber(id);

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename=contas-receber-${fechamento.mesReferencia}-${fechamento.anoReferencia}.xlsx`);

    return reply.send(buffer);
  });

  // Exportar contas a pagar
  app.get('/:id/exportar/pagar', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const fechamento = await prisma.fechamento.findUnique({
      where: { id },
    });

    if (!fechamento) {
      throw new NotFoundError('Fechamento');
    }

    const buffer = await exportarContasPagar(id);

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename=contas-pagar-${fechamento.mesReferencia}-${fechamento.anoReferencia}.xlsx`);

    return reply.send(buffer);
  });
}
