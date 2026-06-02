import { type OcppEvent } from '../rabbitmq/consumer.js';
import { logger } from '../logger.js';

interface StatusNotificationPayload {
  connectorId?: number;
  connectorStatus?: string;
  errorCode?: string;
}

export async function handleStatusNotification(event: OcppEvent): Promise<void> {
  const payload = event.payload as Partial<StatusNotificationPayload>;

  logger.info('StatusNotification received', {
    stationId: event.stationId,
    connectorId: payload.connectorId,
    status: payload.connectorStatus,
    errorCode: payload.errorCode,
  });

  // ── Extend this section with your business logic ─────────────────────────
  //
  // Examples:
  //   • 'Faulted' → page on-call engineer, open a support ticket
  //   • 'Available' → update network availability map
  //   • 'Occupied' → push real-time occupancy to your fleet dashboard
  //
  // ─────────────────────────────────────────────────────────────────────────

  if (payload.connectorStatus === 'Faulted') {
    logger.warn('Charger fault detected', {
      stationId: event.stationId,
      connectorId: payload.connectorId,
      errorCode: payload.errorCode,
    });
  }
}
