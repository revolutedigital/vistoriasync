import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { importarPlanilhaKSI } from '../modules/fechamentos/services/importacao.service.js';
import { calcularValoresFechamento } from '../modules/fechamentos/services/calculo.service.js';
import { ImportJobData, CalculoJobData } from '../lib/queue.js';
import fs from 'fs/promises';

console.log('🔄 Workers starting...');

// Worker de importação
const importWorker = new Worker(
  'import',
  async (job) => {
    console.log(`📥 Processing import job: ${job.id}`);
    const data = job.data as ImportJobData;

    try {
      const fileBuffer = await fs.readFile(data.filePath);
      const resultado = await importarPlanilhaKSI(
        data.fechamentoId,
        fileBuffer,
        data.userId
      );

      // Limpar arquivo temporário
      await fs.unlink(data.filePath).catch(() => {});

      console.log(`✅ Import job ${job.id} completed: ${resultado.importadas} vistorias`);
      return resultado;
    } catch (error) {
      console.error(`❌ Import job ${job.id} failed:`, error);
      throw error;
    }
  },
  { connection: redis }
);

// Worker de cálculo
const calculoWorker = new Worker(
  'calculo',
  async (job) => {
    console.log(`🧮 Processing calculo job: ${job.id}`);
    const data = job.data as CalculoJobData;

    try {
      const resultado = await calcularValoresFechamento(data.fechamentoId);
      console.log(`✅ Calculo job ${job.id} completed: R$ ${resultado.totalReceber}`);
      return resultado;
    } catch (error) {
      console.error(`❌ Calculo job ${job.id} failed:`, error);
      throw error;
    }
  },
  { connection: redis }
);

// Eventos dos workers
[importWorker, calculoWorker].forEach((worker) => {
  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });
});

console.log('✅ Workers ready');

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n${signal} received. Closing workers...`);
    await importWorker.close();
    await calculoWorker.close();
    process.exit(0);
  });
});
