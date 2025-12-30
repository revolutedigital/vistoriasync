import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../utils/errors.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { paginationSchema, paginate, getPrismaSkipTake } from '../../utils/pagination.js';

const createSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  nomeKsi: z.string().min(2, 'Nome KSI deve ter no mínimo 2 caracteres'),
  cnpj: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  diaPagamento: z.number().min(1).max(28).default(12),
  formaPagamento: z.enum(['BOLETO', 'PIX', 'TRANSFERENCIA']).default('BOLETO'),
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
  search: z.string().optional(),
  cidade: z.string().optional(),
  ativo: z.coerce.boolean().optional(),
}).merge(paginationSchema);

export async function imobiliariasRoutes(app: FastifyInstance) {
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
        { cnpj: { contains: query.search } },
      ];
    }

    if (query.cidade) {
      where.cidade = { contains: query.cidade, mode: 'insensitive' };
    }

    if (query.ativo !== undefined) {
      where.ativo = query.ativo;
    }

    const [data, total] = await Promise.all([
      prisma.imobiliaria.findMany({
        where,
        skip,
        take,
        orderBy: { nome: 'asc' },
      }),
      prisma.imobiliaria.count({ where }),
    ]);

    return reply.send({
      success: true,
      ...paginate(data, total, query),
    });
  });

  // Buscar por ID
  app.get('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const imobiliaria = await prisma.imobiliaria.findUnique({
      where: { id },
      include: {
        tabelaPrecos: {
          include: {
            tipoServico: true,
            faixaMetragem: true,
          },
          where: { ativo: true },
        },
        _count: {
          select: {
            vistorias: true,
            faturas: true,
          },
        },
      },
    });

    if (!imobiliaria) {
      throw new NotFoundError('Imobiliária');
    }

    return reply.send({
      success: true,
      data: imobiliaria,
    });
  });

  // Criar
  app.post('/', async (request, reply) => {
    const data = createSchema.parse(request.body);

    const imobiliaria = await prisma.imobiliaria.create({
      data,
    });

    return reply.status(201).send({
      success: true,
      data: imobiliaria,
    });
  });

  // Atualizar
  app.patch('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const data = updateSchema.parse(request.body);

    const imobiliaria = await prisma.imobiliaria.update({
      where: { id },
      data,
    });

    return reply.send({
      success: true,
      data: imobiliaria,
    });
  });

  // Deletar (soft delete)
  app.delete('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    await prisma.imobiliaria.update({
      where: { id },
      data: { ativo: false },
    });

    return reply.send({
      success: true,
      message: 'Imobiliária desativada com sucesso',
    });
  });

  // Tabela de preços da imobiliária
  app.get('/:id/tabela-precos', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const tabela = await prisma.tabelaPreco.findMany({
      where: {
        imobiliariaId: id,
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

  // Criar/Atualizar preço
  app.put('/:id/tabela-precos', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const precoSchema = z.object({
      tipoServicoId: z.string(),
      faixaMetragemId: z.string().optional().nullable(),
      valorBase: z.number().positive(),
      valorMobiliado: z.number().optional().nullable(),
      valorSemiMob: z.number().optional().nullable(),
    });

    const data = precoSchema.parse(request.body);

    const preco = await prisma.tabelaPreco.upsert({
      where: {
        imobiliariaId_tipoServicoId_faixaMetragemId: {
          imobiliariaId: id,
          tipoServicoId: data.tipoServicoId,
          faixaMetragemId: data.faixaMetragemId ?? '',
        },
      },
      create: {
        imobiliariaId: id,
        ...data,
        faixaMetragemId: data.faixaMetragemId ?? undefined,
      },
      update: {
        ...data,
        faixaMetragemId: data.faixaMetragemId ?? undefined,
      },
      include: {
        tipoServico: true,
        faixaMetragem: true,
      },
    });

    return reply.send({
      success: true,
      data: preco,
    });
  });
}
