import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../utils/errors.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const createSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  metrosMin: z.number().min(0),
  metrosMax: z.number().positive(),
  multiplicador: z.number().positive().default(1),
  ordem: z.number().int().default(0),
});

const updateSchema = createSchema.partial();

export async function faixasMetragemRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // Listar
  app.get('/', async (request, reply) => {
    const faixas = await prisma.faixaMetragem.findMany({
      orderBy: { ordem: 'asc' },
    });

    return reply.send({
      success: true,
      data: faixas,
    });
  });

  // Buscar por ID
  app.get('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const faixa = await prisma.faixaMetragem.findUnique({
      where: { id },
    });

    if (!faixa) {
      throw new NotFoundError('Faixa de Metragem');
    }

    return reply.send({
      success: true,
      data: faixa,
    });
  });

  // Criar
  app.post('/', async (request, reply) => {
    const data = createSchema.parse(request.body);

    const faixa = await prisma.faixaMetragem.create({
      data,
    });

    return reply.status(201).send({
      success: true,
      data: faixa,
    });
  });

  // Atualizar
  app.patch('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const data = updateSchema.parse(request.body);

    const faixa = await prisma.faixaMetragem.update({
      where: { id },
      data,
    });

    return reply.send({
      success: true,
      data: faixa,
    });
  });

  // Deletar
  app.delete('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    await prisma.faixaMetragem.delete({
      where: { id },
    });

    return reply.send({
      success: true,
      message: 'Faixa de Metragem removida com sucesso',
    });
  });
}
