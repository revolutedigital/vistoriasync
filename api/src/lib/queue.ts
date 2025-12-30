import { Queue, Worker, Job } from 'bullmq';
import { redis } from './redis.js';

// Conexão para as filas
const connection = {
  connection: redis,
};

// Fila de importação de planilhas
export const importQueue = new Queue('import', connection);

// Fila de cálculos
export const calculoQueue = new Queue('calculo', connection);

// Fila de notificações (para fase 2)
export const notificacaoQueue = new Queue('notificacao', connection);

// Tipos de jobs
export interface ImportJobData {
  fechamentoId: string;
  filePath: string;
  userId: string;
}

export interface CalculoJobData {
  fechamentoId: string;
  userId: string;
}

export interface NotificacaoJobData {
  tipo: 'whatsapp' | 'email';
  destinatario: string;
  template: string;
  dados: Record<string, unknown>;
}

// Helper para adicionar jobs
export async function addImportJob(data: ImportJobData) {
  return importQueue.add('import-planilha', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export async function addCalculoJob(data: CalculoJobData) {
  return calculoQueue.add('calcular-valores', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}
