import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../utils/errors.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { paginationSchema, paginate, getPrismaSkipTake } from '../../utils/pagination.js';

const createSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  nomeKsi: z.string().min(2, 'Nome KSI deve ter no mínimo 2 caracteres'),
  cpf: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  chavePix: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
  search: z.string().optional(),
  cidade: z.string().optional(),
  ativo: z.coerce.boolean().optional(),
}).merge(paginationSchema);

export async function vistoriadoresRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // Listar
  app.get('/', async (request, reply) => {
    const query = querySchema.parse(request.query);
    const { skip, take } = getPrismaSkipTake(query);

    const where: any = {};

    if (query.search) {
      where.OR = [
        { nome: { contains: query.search, mode: 'insensitive' } },
        { nomeKsi: { contains: query.search, mode: 'insensitive' } },
        { cpf: { contains: query.search } },
      ];
    }

    if (query.cidade) {
      where.cidade = { contains: query.cidade, mode: 'insensitive' };
    }

    if (query.ativo !== undefined) {
      where.ativo = query.ativo;
    }

    const [data, total] = await Promise.all([
      prisma.vistoriador.findMany({
        where,
        skip,
        take,
        orderBy: { nome: 'asc' },
      }),
      prisma.vistoriador.count({ where }),
    ]);

    return reply.send({
      success: true,
      ...paginate(data, total, query),
    });
  });

  // Buscar por ID
  app.get('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const vistoriador = await prisma.vistoriador.findUnique({
      where: { id },
      include: {
        tabelaPagamentos: {
          include: {
            tipoServico: true,
            faixaMetragem: true,
          },
          where: { ativo: true },
        },
        _count: {
          select: {
            vistorias: true,
            pagamentos: true,
            contestacoes: true,
          },
        },
      },
    });

    if (!vistoriador) {
      throw new NotFoundError('Vistoriador');
    }

    return reply.send({
      success: true,
      data: vistoriador,
    });
  });

  // Criar
  app.post('/', async (request, reply) => {
    const data = createSchema.parse(request.body);

    const vistoriador = await prisma.vistoriador.create({
      data,
    });

    return reply.status(201).send({
      success: true,
      data: vistoriador,
    });
  });

  // Atualizar
  app.patch('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const data = updateSchema.parse(request.body);

    const vistoriador = await prisma.vistoriador.update({
      where: { id },
      data,
    });

    return reply.send({
      success: true,
      data: vistoriador,
    });
  });

  // Deletar (soft delete)
  app.delete('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    await prisma.vistoriador.update({
      where: { id },
      data: { ativo: false },
    });

    return reply.send({
      success: true,
      message: 'Vistoriador desativado com sucesso',
    });
  });

  // Tabela de pagamentos do vistoriador
  app.get('/:id/tabela-pagamentos', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const tabela = await prisma.tabelaPagamentoVistoriador.findMany({
      where: {
        vistoriadorId: id,
        ativo: true,
      },
      include: {
        tipoServico: true,
        faixaMetragem: true,
      },
      orderBy: [
        { tipoServico: { codigo: 'asc' } },
        { faixaMetragem: { ordem: 'asc' } },
      ],
    });

    return reply.send({
      success: true,
      data: tabela,
    });
  });

  // Criar/Atualizar pagamento
  app.put('/:id/tabela-pagamentos', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const pagamentoSchema = z.object({
      tipoServicoId: z.string(),
      faixaMetragemId: z.string().optional().nullable(),
      valorBase: z.number().positive(),
      valorMobiliado: z.number().optional().nullable(),
      valorSemiMob: z.number().optional().nullable(),
    });

    const data = pagamentoSchema.parse(request.body);

    const pagamento = await prisma.tabelaPagamentoVistoriador.upsert({
      where: {
        vistoriadorId_tipoServicoId_faixaMetragemId: {
          vistoriadorId: id,
          tipoServicoId: data.tipoServicoId,
          faixaMetragemId: data.faixaMetragemId ?? null,
        },
      },
      create: {
        vistoriadorId: id,
        ...data,
      },
      update: data,
      include: {
        tipoServico: true,
        faixaMetragem: true,
      },
    });

    return reply.send({
      success: true,
      data: pagamento,
    });
  });
}
