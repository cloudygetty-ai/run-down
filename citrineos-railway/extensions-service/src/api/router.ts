import { Router } from 'express';
import { buildHealthRouter } from './health.js';

// ── API surface exposed by the extensions service ──────────────────────────
//
// Add new route groups here as your extensions grow.
// Each route group should live in its own file under src/api/.
//
// Example structure:
//   src/api/billing.ts   → /api/billing/*
//   src/api/loyalty.ts   → /api/loyalty/*
//   src/api/alerts.ts    → /api/alerts/*
//
// ─────────────────────────────────────────────────────────────────────────

export function buildApiRouter(): Router {
  const router = Router();

  router.use('/health', buildHealthRouter());

  // TODO[NORMAL]: add /api/billing, /api/loyalty, /api/alerts routes here

  return router;
}
