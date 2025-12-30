import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { UserRole } from '@prisma/client';

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new UnauthorizedError('Token inválido ou expirado');
  }
}

export function requireRoles(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authMiddleware(request, reply);

    if (!roles.includes(request.user.role)) {
      throw new ForbiddenError('Você não tem permissão para acessar este recurso');
    }
  };
}

export const requireAdmin = requireRoles('ADMIN');
export const requireGerente = requireRoles('ADMIN', 'GERENTE');
export const requireOperador = requireRoles('ADMIN', 'GERENTE', 'OPERADOR');
