import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../utils/errors.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { paginationSchema, paginate, getPrismaSkipTake } from '../../utils/pagination.js';
import { recalcularVistoria } from '../fechamentos/services/calculo.service.js';

const querySchema = z.object({
  fechamentoId: z.string().optional(),
  imobiliariaId: z.string().optional(),
  vistoriadorId: z.string().optional(),
  tipoServicoId: z.string().optional(),
  status: z.string().optional(),
  cidade: z.string().optional(),
  search: z.string().optional(),
}).merge(paginationSchema);

const updateSchema = z.object({
  areaInformada: z.number().optional(),
  areaAferida: z.number().optional(),
  areaFaturar: z.number().optional(),
  tipoMobilia: z.enum(['NAO', 'SEMI', 'SIM']).optional(),
  tipoServicoId: z.string().optional(),
  observacao: z.string().optional(),
  status: z.enum(['IMPORTADA', 'CALCULADA', 'CONTESTADA', 'REVISADA', 'APROVADA', 'FATURADA']).optional(),
});

export async function vistoriasRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // Listar vistorias
  app.get('/', async (request, reply) => {
    const query = querySchema.parse(request.query);
    const { skip, take } = getPrismaSkipTake(query);

    const where: any = {};

    if (query.fechamentoId) where.fechamentoId = query.fechamentoId;
    if (query.imobiliariaId) where.imobiliariaId = query.imobiliariaId;
    if (query.vistoriadorId) where.vistoriadorId = query.vistoriadorId;
    if (query.tipoServicoId) where.tipoServicoId = query.tipoServicoId;
    if (query.status) where.status = query.status;
    if (query.cidade) where.cidade = { contains: query.cidade, mode: 'insensitive' };

    if (query.search) {
      where.OR = [
        { endereco: { contains: query.search, mode: 'insensitive' } },
        { idKsi: { contains: query.search } },
        { numeroContrato: { contains: query.search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.vistoria.findMany({
        where,
        skip,
        take,
        include: {
          fechamento: { select: { id: true, mesReferencia: true, anoReferencia: true } },
          imobiliaria: { select: { id: true, nome: true } },
          vistoriador: { select: { id: true, nome: true } },
          tipoServico: { select: { id: true, codigo: true, nome: true } },
          _count: { select: { contestacoes: true } },
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

  // Buscar vistoria por ID
  app.get('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const vistoria = await prisma.vistoria.findUnique({
      where: { id },
      include: {
        fechamento: true,
        imobiliaria: true,
        vistoriador: true,
        tipoServico: true,
        contestacoes: {
          include: {
            vistoriador: { select: { id: true, nome: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vistoria) {
      throw new NotFoundError('Vistoria');
    }

    return reply.send({
      success: true,
      data: vistoria,
    });
  });

  // Atualizar vistoria
  app.patch('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const data = updateSchema.parse(request.body);

    const vistoria = await prisma.vistoria.update({
      where: { id },
      data,
      include: {
        imobiliaria: { select: { id: true, nome: true } },
        vistoriador: { select: { id: true, nome: true } },
        tipoServico: { select: { id: true, codigo: true, nome: true } },
      },
    });

    return reply.send({
      success: true,
      data: vistoria,
    });
  });

  // Recalcular valores de uma vistoria
  app.post('/:id/recalcular', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const vistoria = await recalcularVistoria(id);

    return reply.send({
      success: true,
      data: vistoria,
    });
  });

  // Aprovar vistoria manualmente
  app.post('/:id/aprovar', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const vistoria = await prisma.vistoria.update({
      where: { id },
      data: { status: 'APROVADA' },
    });

    return reply.send({
      success: true,
      data: vistoria,
    });
  });

  // Aprovar várias vistorias
  app.post('/aprovar-lote', async (request, reply) => {
    const schema = z.object({
      ids: z.array(z.string()).min(1),
    });

    const { ids } = schema.parse(request.body);

    await prisma.vistoria.updateMany({
      where: { id: { in: ids } },
      data: { status: 'APROVADA' },
    });

    return reply.send({
      success: true,
      message: `${ids.length} vistorias aprovadas`,
    });
  });
}
