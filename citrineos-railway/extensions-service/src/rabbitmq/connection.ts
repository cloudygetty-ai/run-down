import amqplib, { type Channel, type Connection } from 'amqplib';
import { config } from '../config.js';
import { logger } from '../logger.js';

type ConnectionState = {
  connection: Connection | null;
  channel: Channel | null;
};

const state: ConnectionState = { connection: null, channel: null };

async function connect(): Promise<Channel> {
  logger.info('Connecting to RabbitMQ', { url: config.rabbitmq.url.replace(/:\/\/.*@/, '://***@') });

  const connection = await amqplib.connect(config.rabbitmq.url);
  const channel = await connection.createChannel();

  await channel.assertExchange(
    config.rabbitmq.exchange,
    config.rabbitmq.exchangeType,
    { durable: true },
  );

  channel.prefetch(config.rabbitmq.prefetch);

  connection.on('error', (err: Error) => {
    logger.error('RabbitMQ connection error — reconnecting', { error: err.message });
    scheduleReconnect();
  });

  connection.on('close', () => {
    logger.warn('RabbitMQ connection closed — reconnecting');
    scheduleReconnect();
  });

  state.connection = connection;
  state.channel = channel;

  logger.info('RabbitMQ connected');
  return channel;
}

function scheduleReconnect(): void {
  state.connection = null;
  state.channel = null;
  setTimeout(() => {
    connect().catch((err: unknown) => {
      logger.error('RabbitMQ reconnect failed', { error: String(err) });
    });
  }, config.rabbitmq.reconnectDelayMs);
}

export async function getChannel(): Promise<Channel> {
  if (state.channel) return state.channel;
  return connect();
}

export async function closeConnection(): Promise<void> {
  try {
    await state.channel?.close();
    await state.connection?.close();
  } catch {
    // Already closed — no action needed
  }
  state.channel = null;
  state.connection = null;
}
