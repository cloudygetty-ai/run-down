import { config } from './config.js';
import { logger } from './logger.js';
import { buildApp } from './server.js';
import { startConsumer } from './rabbitmq/consumer.js';
import { closeConnection } from './rabbitmq/connection.js';

async function main(): Promise<void> {
  logger.info('Starting CitrineOS Extensions Service', { port: config.port });

  const app = buildApp();

  const server = app.listen(config.port, () => {
    logger.info('HTTP server listening', { port: config.port });
  });

  await startConsumer();

  // Graceful shutdown on SIGTERM (Railway sends this before stopping the container)
  const shutdown = async (signal: string): Promise<void> => {
    logger.info('Shutdown signal received', { signal });
    server.close(() => logger.info('HTTP server closed'));
    await closeConnection();
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT',  () => { void shutdown('SIGINT'); });
}

main().catch((err: unknown) => {
  logger.error('Fatal startup error', { error: String(err) });
  process.exit(1);
});
