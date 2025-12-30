import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../utils/errors.js';
import { authMiddleware, requireAdmin } from '../../middlewares/auth.middleware.js';
import { paginationSchema, paginate, getPrismaSkipTake } from '../../utils/pagination.js';

const createSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  role: z.enum(['ADMIN', 'GERENTE', 'OPERADOR']).default('OPERADOR'),
});

const updateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'GERENTE', 'OPERADOR']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

const querySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'GERENTE', 'OPERADOR']).optional(),
  active: z.coerce.boolean().optional(),
}).merge(paginationSchema);

export async function usersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin);

  // Listar usuários
  app.get('/', async (request, reply) => {
    const query = querySchema.parse(request.query);
    const { skip, take } = getPrismaSkipTake(query);

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) where.role = query.role;
    if (query.active !== undefined) where.active = query.active;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    return reply.send({
      success: true,
      ...paginate(data, total, query),
    });
  });

  // Buscar usuário por ID
  app.get('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuário');
    }

    return reply.send({
      success: true,
      data: user,
    });
  });

  // Criar usuário
  app.post('/', async (request, reply) => {
    const data = createSchema.parse(request.body);

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return reply.status(201).send({
      success: true,
      data: user,
    });
  });

  // Atualizar usuário
  app.patch('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const data = updateSchema.parse(request.body);

    const updateData: any = { ...data };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    return reply.send({
      success: true,
      data: user,
    });
  });

  // Desativar usuário
  app.delete('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    return reply.send({
      success: true,
      message: 'Usuário desativado com sucesso',
    });
  });
}
