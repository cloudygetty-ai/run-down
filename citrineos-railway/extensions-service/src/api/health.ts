import { type Request, type Response, type Router, Router as ExpressRouter } from 'express';

const startTime = Date.now();

export function buildHealthRouter(): Router {
  const router = ExpressRouter();

  router.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'citrineos-extensions',
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    });
  });

  return router;
}
