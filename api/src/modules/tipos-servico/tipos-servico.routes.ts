import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../utils/errors.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const createSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  descricao: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

export async function tiposServicoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // Listar
  app.get('/', async (request, reply) => {
    const tiposServico = await prisma.tipoServico.findMany({
      orderBy: { codigo: 'asc' },
    });

    return reply.send({
      success: true,
      data: tiposServico,
    });
  });

  // Buscar por ID
  app.get('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const tipoServico = await prisma.tipoServico.findUnique({
      where: { id },
    });

    if (!tipoServico) {
      throw new NotFoundError('Tipo de Serviço');
    }

    return reply.send({
      success: true,
      data: tipoServico,
    });
  });

  // Criar
  app.post('/', async (request, reply) => {
    const data = createSchema.parse(request.body);

    const tipoServico = await prisma.tipoServico.create({
      data,
    });

    return reply.status(201).send({
      success: true,
      data: tipoServico,
    });
  });

  // Atualizar
  app.patch('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const data = updateSchema.parse(request.body);

    const tipoServico = await prisma.tipoServico.update({
      where: { id },
      data,
    });

    return reply.send({
      success: true,
      data: tipoServico,
    });
  });

  // Deletar (soft delete)
  app.delete('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    await prisma.tipoServico.update({
      where: { id },
      data: { ativo: false },
    });

    return reply.send({
      success: true,
      message: 'Tipo de Serviço desativado com sucesso',
    });
  });
}
