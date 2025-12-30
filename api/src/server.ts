import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';

import { env } from './config/env.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { prisma } from './lib/prisma.js';

// Importar rotas
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { imobiliariasRoutes } from './modules/imobiliarias/imobiliarias.routes.js';
import { vistoriadoresRoutes } from './modules/vistoriadores/vistoriadores.routes.js';
import { tiposServicoRoutes } from './modules/tipos-servico/tipos-servico.routes.js';
import { faixasMetragemRoutes } from './modules/faixas-metragem/faixas-metragem.routes.js';
import { fechamentosRoutes } from './modules/fechamentos/fechamentos.routes.js';
import { vistoriasRoutes } from './modules/vistorias/vistorias.routes.js';

const app = Fastify({
  logger: env.NODE_ENV === 'development' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  } : true,
});

// Plugins
app.register(cors, {
  origin: env.NODE_ENV === 'development' ? true : env.WEB_URL,
  credentials: true,
});

app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: {
    expiresIn: env.JWT_EXPIRES_IN,
  },
});

app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Error handler
app.setErrorHandler(errorHandler);

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Registrar rotas
app.register(authRoutes, { prefix: '/api/auth' });
app.register(usersRoutes, { prefix: '/api/users' });
app.register(imobiliariasRoutes, { prefix: '/api/imobiliarias' });
app.register(vistoriadoresRoutes, { prefix: '/api/vistoriadores' });
app.register(tiposServicoRoutes, { prefix: '/api/tipos-servico' });
app.register(faixasMetragemRoutes, { prefix: '/api/faixas-metragem' });
app.register(fechamentosRoutes, { prefix: '/api/fechamentos' });
app.register(vistoriasRoutes, { prefix: '/api/vistorias' });

// Rota 404
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Rota ${request.method} ${request.url} não encontrada`,
    },
  });
});

// Iniciar servidor
const start = async () => {
  try {
    // Verificar conexão com banco
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL');

    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n${signal} received. Closing server...`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  });
});
