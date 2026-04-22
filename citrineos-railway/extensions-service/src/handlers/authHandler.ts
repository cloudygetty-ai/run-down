import { type OcppEvent } from '../rabbitmq/consumer.js';
import { logger } from '../logger.js';

interface AuthorizePayload {
  idToken?: {
    idToken?: string;
    type?: string;
  };
}

export async function handleAuthorize(event: OcppEvent): Promise<void> {
  const payload = event.payload as Partial<AuthorizePayload>;
  const tokenId = payload.idToken?.idToken ?? 'unknown';
  const tokenType = payload.idToken?.type ?? 'unknown';

  logger.info('Authorize request received', {
    stationId: event.stationId,
    tokenId,
    tokenType,
  });

  // ── Extend this section with your business logic ─────────────────────────
  //
  // Examples:
  //   • Look up loyalty points balance for this token
  //   • Apply a discount rate for fleet accounts
  //   • Log access for audit trail / compliance
  //
  // Note: CitrineOS Core handles the actual OCPP Authorize response.
  // This handler runs *after* the event is published — it is a side-effect
  // hook, not an authorisation gate.
  //
  // ─────────────────────────────────────────────────────────────────────────
}
