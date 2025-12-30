import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { UnauthorizedError, NotFoundError } from '../../utils/errors.js';
import { authMiddleware, JWTPayload } from '../../middlewares/auth.middleware.js';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
});

export async function authRoutes(app: FastifyInstance) {
  // Login
  app.post('/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('Email ou senha inválidos');
    }

    if (!user.active) {
      throw new UnauthorizedError('Usuário inativo');
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new UnauthorizedError('Email ou senha inválidos');
    }

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = app.jwt.sign(payload);

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  });

  // Registro (apenas para admin criar novos usuários)
  app.post('/register', { preHandler: [authMiddleware] }, async (request, reply) => {
    const currentUser = request.user;

    if (currentUser.role !== 'ADMIN') {
      throw new UnauthorizedError('Apenas administradores podem criar usuários');
    }

    const { email, password, name } = registerSchema.parse(request.body);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
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

  // Dados do usuário atual
  app.get('/me', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
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

  // Alterar senha
  app.patch('/change-password', { preHandler: [authMiddleware] }, async (request, reply) => {
    const schema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6),
    });

    const { currentPassword, newPassword } = schema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
    });

    if (!user) {
      throw new NotFoundError('Usuário');
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      throw new UnauthorizedError('Senha atual incorreta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return reply.send({
      success: true,
      message: 'Senha alterada com sucesso',
    });
  });
}
