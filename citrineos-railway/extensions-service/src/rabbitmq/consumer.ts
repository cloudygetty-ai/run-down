import { type ConsumeMessage } from 'amqplib';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { getChannel } from './connection.js';
import { dispatch } from '../handlers/index.js';

export interface OcppEvent {
  action: string;
  stationId: string;
  tenantId: string;
  payload: unknown;
  timestamp: string;
}

function parseMessage(msg: ConsumeMessage): OcppEvent | null {
  try {
    const raw = msg.content.toString('utf8');
    const parsed = JSON.parse(raw) as Partial<OcppEvent>;

    if (!parsed.action || !parsed.stationId) {
      logger.warn('Received malformed OCPP event — missing action or stationId', {
        routingKey: msg.fields.routingKey,
      });
      return null;
    }

    return {
      action: parsed.action,
      stationId: parsed.stationId,
      tenantId: parsed.tenantId ?? 'default',
      payload: parsed.payload ?? {},
      timestamp: parsed.timestamp ?? new Date().toISOString(),
    };
  } catch (err) {
    logger.error('Failed to parse OCPP event message', { error: String(err) });
    return null;
  }
}

export async function startConsumer(): Promise<void> {
  const channel = await getChannel();
  const { queue, exchange, routingKeys } = config.rabbitmq;

  await channel.assertQueue(queue, { durable: true });

  for (const key of routingKeys) {
    await channel.bindQueue(queue, exchange, key);
    logger.info('Bound queue to exchange', { queue, exchange, routingKey: key });
  }

  await channel.consume(queue, async (msg) => {
    if (!msg) return;

    const event = parseMessage(msg);

    if (!event) {
      channel.nack(msg, false, false);
      return;
    }

    try {
      await dispatch(event);
      channel.ack(msg);
    } catch (err) {
      logger.error('Handler threw — message will be requeued once', {
        action: event.action,
        stationId: event.stationId,
        error: String(err),
      });
      // Requeue=false to avoid poison-message loops; dead-letter queue handles it
      channel.nack(msg, false, false);
    }
  });

  logger.info('OCPP event consumer started', { queue });
}
