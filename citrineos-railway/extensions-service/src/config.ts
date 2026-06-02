function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optionalEnv('PORT', '3001'), 10),

  rabbitmq: {
    url: requireEnv('RABBITMQ_URL'),
    exchange: optionalEnv('RABBITMQ_EXCHANGE', 'citrineos'),
    exchangeType: 'topic' as const,
    queue: optionalEnv('RABBITMQ_QUEUE', 'extensions.main'),
    routingKeys: optionalEnv('RABBITMQ_ROUTING_KEYS', 'ocpp.#').split(','),
    prefetch: parseInt(optionalEnv('RABBITMQ_PREFETCH', '10'), 10),
    reconnectDelayMs: 5_000,
  },

  citrineosCore: {
    baseUrl: optionalEnv('CITRINEOS_CORE_URL', 'http://citrineos-core:8080'),
  },

  logLevel: optionalEnv('LOG_LEVEL', 'info'),
} as const;
