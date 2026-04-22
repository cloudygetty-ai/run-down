import express, { type Application } from 'express';
import { buildApiRouter } from './api/router.js';

export function buildApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use('/', buildApiRouter());

  return app;
}
