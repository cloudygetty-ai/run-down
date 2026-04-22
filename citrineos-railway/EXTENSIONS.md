# Adding New Logic to the Extensions Service

The extensions service lets you add custom business logic to CitrineOS without touching the core source code. It works in two ways:

1. **Event-driven** — subscribe to OCPP events published by CitrineOS Core on RabbitMQ.
2. **API-driven** — call CitrineOS Core's REST API directly from your handler.

---

## How It Works

```
CitrineOS Core
      │
      │  publishes OCPP events to RabbitMQ
      │  exchange: citrineos  (topic)
      │  routing key: ocpp.<ActionName>
      ▼
   RabbitMQ
      │
      │  queue: extensions.main
      │  routing key: ocpp.#  (all actions)
      ▼
Extensions Service
      │
      ├── dispatch() looks up registered handler
      │
      └── handler(event) ← your business logic runs here
```

The `event` object passed to every handler:

```typescript
interface OcppEvent {
  action: string;      // e.g. "TransactionEvent", "StatusNotification"
  stationId: string;   // charge point identifier
  tenantId: string;    // multi-tenant identifier
  payload: unknown;    // the raw OCPP action payload (cast to your type)
  timestamp: string;   // ISO 8601
}
```

---

## Step-by-Step: Adding a New Handler

### 1. Create the handler file

Create `extensions-service/src/handlers/myHandler.ts`:

```typescript
import { type OcppEvent } from '../rabbitmq/consumer.js';
import { logger } from '../logger.js';

// Define the shape of the OCPP payload you expect
interface MeterValuesPayload {
  evseId?: number;
  meterValue?: Array<{
    sampledValue?: Array<{ value?: number; measurand?: string }>;
  }>;
}

export async function handleMeterValues(event: OcppEvent): Promise<void> {
  const payload = event.payload as Partial<MeterValuesPayload>;

  // Your logic here — call external APIs, write to a database, send webhooks
  logger.info('MeterValues received', {
    stationId: event.stationId,
    evseId: payload.evseId,
  });
}
```

Rules:
- The function **must** be `async` and return `Promise<void>`.
- Throw an error if you want the message to be nacked (it will be discarded — dead-letter queue handles it).
- Do not throw for recoverable errors — log them and return normally.

### 2. Register the handler

Open `extensions-service/src/handlers/index.ts` and add your handler:

```typescript
import { handleMeterValues } from './myHandler.js';   // add this line

const HANDLERS: HandlerEntry[] = [
  { action: 'TransactionEvent',   handler: handleTransactionEvent },
  { action: 'StatusNotification', handler: handleStatusNotification },
  { action: 'Authorize',          handler: handleAuthorize },
  { action: 'MeterValues',        handler: handleMeterValues },  // add this line
];
```

Action names are case-sensitive and match the OCPP 2.0.1 specification exactly.

### 3. (Optional) Add an HTTP endpoint

If your handler needs to expose data (e.g., a webhook receiver or a query endpoint):

Create `extensions-service/src/api/myRoutes.ts`:

```typescript
import { Router, type Request, type Response } from 'express';

export function buildMyRouter(): Router {
  const router = Router();

  router.get('/status', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  return router;
}
```

Then register it in `extensions-service/src/api/router.ts`:

```typescript
import { buildMyRouter } from './myRoutes.js';

export function buildApiRouter(): Router {
  const router = Router();
  router.use('/health', buildHealthRouter());
  router.use('/my-feature', buildMyRouter());   // available at /api/extensions/my-feature
  return router;
}
```

### 4. Deploy

```bash
# Local: rebuild the extensions service container
docker compose up -d --build extensions

# Railway: push your changes — Railway auto-deploys on push to the configured branch
git commit -am "feat(extensions): add MeterValues handler"
git push
```

---

## Calling CitrineOS Core's REST API

Your handler can call CitrineOS Core's HTTP API directly. The base URL is injected via `CITRINEOS_CORE_URL`:

```typescript
import { config } from '../config.js';

async function sendRemoteStart(stationId: string, evseId: number): Promise<void> {
  const res = await fetch(`${config.citrineosCore.baseUrl}/ocpp/RequestStartTransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stationId, evseId, idToken: { idToken: 'AUTO', type: 'Central' } }),
  });
  if (!res.ok) throw new Error(`CitrineOS Core returned ${res.status}`);
}
```

CitrineOS Core API reference: https://github.com/citrineos/citrineos-core/tree/main/00_Base/src/interfaces

---

## Querying Data via Hasura GraphQL

To read charging data from TimescaleDB via Hasura from inside the extensions service:

```typescript
const HASURA_URL = process.env.HASURA_INTERNAL_URL ?? 'http://hasura:8080/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? '';

async function getRecentTransactions(stationId: string): Promise<unknown[]> {
  const res = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      query: `
        query RecentTransactions($stationId: String!) {
          transactions(where: { station_id: { _eq: $stationId } }, limit: 10, order_by: { started_at: desc }) {
            id
            station_id
            started_at
            energy_kwh
          }
        }
      `,
      variables: { stationId },
    }),
  });
  const data = (await res.json()) as { data?: { transactions: unknown[] } };
  return data.data?.transactions ?? [];
}
```

Add `HASURA_INTERNAL_URL` and `HASURA_GRAPHQL_ADMIN_SECRET` to the extensions service environment variables in Railway (reference `${{hasura.HASURA_GRAPHQL_ADMIN_SECRET}}`).

---

## OCPP 2.0.1 Action Reference

Common actions you can handle:

| Action | When it fires |
|---|---|
| `BootNotification` | Charge point connects / reboots |
| `Authorize` | Driver presents RFID/app token |
| `TransactionEvent` | Session started, meter updated, session ended |
| `StatusNotification` | Connector status change (Available, Charging, Faulted…) |
| `MeterValues` | Periodic meter readings |
| `Heartbeat` | Charge point keepalive |
| `NotifyReport` | Charge point configuration report |
| `LogStatusNotification` | Upload log status |
| `FirmwareStatusNotification` | Firmware update progress |

Full spec: https://www.openchargealliance.org/protocols/ocpp-201/

---

## Example: Billing Integration

```typescript
// src/handlers/billingHandler.ts
import { type OcppEvent } from '../rabbitmq/consumer.js';
import { logger } from '../logger.js';

interface TransactionEventPayload {
  eventType: 'Started' | 'Updated' | 'Ended';
  transactionInfo?: { transactionId?: string };
  meterValue?: Array<{ sampledValue?: Array<{ value?: number; measurand?: string }> }>;
}

export async function handleBillingTransactionEvent(event: OcppEvent): Promise<void> {
  const payload = event.payload as Partial<TransactionEventPayload>;
  const transactionId = payload.transactionInfo?.transactionId;

  switch (payload.eventType) {
    case 'Started':
      await fetch('https://your-billing-api.example.com/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.BILLING_API_KEY ?? ''}` },
        body: JSON.stringify({ transactionId, stationId: event.stationId, startedAt: event.timestamp }),
      });
      break;

    case 'Ended':
      await fetch(`https://your-billing-api.example.com/sessions/${transactionId ?? ''}/finalize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.BILLING_API_KEY ?? ''}` },
      });
      break;
  }

  logger.info('Billing event processed', { eventType: payload.eventType, transactionId });
}
```

Register it in `handlers/index.ts` with action `'TransactionEvent'` — or add it alongside the existing `handleTransactionEvent` by calling both from a combined handler.

---

## Environment Variables for Extensions

Add custom variables to the extensions service in Railway and they'll be available as `process.env.MY_VAR`. Reference other service secrets using `${{service.VARIABLE}}` syntax in Railway's variable editor.

| Variable | Purpose |
|---|---|
| `BILLING_API_KEY` | Your billing provider API key |
| `WEBHOOK_URL` | Outbound webhook endpoint |
| `HASURA_INTERNAL_URL` | `http://${{hasura.RAILWAY_PRIVATE_DOMAIN}}:8080/v1/graphql` |
| `HASURA_GRAPHQL_ADMIN_SECRET` | `${{hasura.HASURA_GRAPHQL_ADMIN_SECRET}}` |
