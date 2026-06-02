import { type OcppEvent } from '../rabbitmq/consumer.js';
import { logger } from '../logger.js';
import { handleTransactionEvent } from './transactionHandler.js';
import { handleStatusNotification } from './statusHandler.js';
import { handleAuthorize } from './authHandler.js';

// Handler registry — maps OCPP action names to handler functions.
//
// To add a new handler:
//   1. Create src/handlers/myHandler.ts exporting an async function
//   2. Import it here
//   3. Add an entry: { action: 'OcppActionName', handler: handleMyAction }
//
// Action names match the OCPP 2.0.1 spec (PascalCase).

type Handler = (event: OcppEvent) => Promise<void>;

interface HandlerEntry {
  action: string;
  handler: Handler;
}

const HANDLERS: HandlerEntry[] = [
  { action: 'TransactionEvent',    handler: handleTransactionEvent },
  { action: 'StatusNotification',  handler: handleStatusNotification },
  { action: 'Authorize',           handler: handleAuthorize },
];

const handlerMap = new Map<string, Handler>(
  HANDLERS.map(({ action, handler }) => [action, handler]),
);

export async function dispatch(event: OcppEvent): Promise<void> {
  const handler = handlerMap.get(event.action);

  if (!handler) {
    logger.debug('No handler registered for action', {
      action: event.action,
      stationId: event.stationId,
    });
    return;
  }

  await handler(event);
}
