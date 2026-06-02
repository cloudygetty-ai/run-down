import { type OcppEvent } from '../rabbitmq/consumer.js';
import { logger } from '../logger.js';

interface TransactionEventPayload {
  eventType: 'Started' | 'Updated' | 'Ended';
  transactionInfo?: {
    transactionId?: string;
    chargingState?: string;
  };
  meterValue?: Array<{
    sampledValue?: Array<{ value?: number; measurand?: string; unit?: string }>;
  }>;
}

export async function handleTransactionEvent(event: OcppEvent): Promise<void> {
  const payload = event.payload as Partial<TransactionEventPayload>;
  const eventType = payload.eventType ?? 'Unknown';
  const transactionId = payload.transactionInfo?.transactionId ?? 'unknown';

  logger.info('TransactionEvent received', {
    stationId: event.stationId,
    transactionId,
    eventType,
    chargingState: payload.transactionInfo?.chargingState,
  });

  // ── Extend this section with your business logic ─────────────────────────
  //
  // Examples:
  //   • Started  → create billing session in your system
  //   • Updated  → record meter values to your time-series store
  //   • Ended    → finalize invoice, send receipt email
  //
  // The event object contains stationId, tenantId, timestamp, and full payload.
  //
  // ─────────────────────────────────────────────────────────────────────────

  switch (eventType) {
    case 'Started':
      logger.info('Charging session started', { stationId: event.stationId, transactionId });
      break;

    case 'Updated': {
      const kwh = extractKwh(payload);
      if (kwh !== null) {
        logger.info('Meter update', { stationId: event.stationId, transactionId, kWh: kwh });
      }
      break;
    }

    case 'Ended':
      logger.info('Charging session ended', { stationId: event.stationId, transactionId });
      break;

    default:
      logger.warn('Unknown TransactionEvent type', { eventType });
  }
}

function extractKwh(payload: Partial<TransactionEventPayload>): number | null {
  const sampledValues = payload.meterValue?.[0]?.sampledValue ?? [];
  const energyReading = sampledValues.find((sv) => sv.measurand === 'Energy.Active.Import.Register');
  if (energyReading?.value !== undefined) return energyReading.value;
  return null;
}
