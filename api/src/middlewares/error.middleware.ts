import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../utils/errors.js';
import { env } from '../config/env.js';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log do erro
  console.error(`[ERROR] ${request.method} ${request.url}:`, error);

  // Erros de validação Zod
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    });

    return reply.status(422).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Erro de validação',
        errors,
      },
    });
  }

  // Erros de validação da aplicação
  if (error instanceof ValidationError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        errors: error.errors,
      },
    });
  }

  // Erros conhecidos da aplicação
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  // Erros do Prisma
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;

    if (prismaError.code === 'P2002') {
      const field = prismaError.meta?.target?.[0] || 'campo';
      return reply.status(409).send({
        success: false,
        error: {
          code: 'CONFLICT',
          message: `Já existe um registro com este ${field}`,
        },
      });
    }

    if (prismaError.code === 'P2025') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Registro não encontrado',
        },
      });
    }
  }

  // Erro genérico
  const statusCode = error.statusCode || 500;
  const message =
    env.NODE_ENV === 'production' && statusCode === 500
      ? 'Erro interno do servidor'
      : error.message;

  return reply.status(statusCode).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      ...(env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
}
