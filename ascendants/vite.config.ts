import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const resolvePath = (dir: string) => fileURLToPath(new URL(dir, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@engine': resolvePath('./src/engine'),
      '@net': resolvePath('./src/net'),
      '@render': resolvePath('./src/render'),
      '@ui': resolvePath('./src/ui'),
      '@client': resolvePath('./src/client'),
      '@telemetry': resolvePath('./src/telemetry'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // three.js dominates the bundle and every byte of it is needed on the
    // first frame, so code-splitting would only add a round trip.
    chunkSizeWarningLimit: 900,
  },
  test: { globals: true, environment: 'node', include: ['src/**/*.test.ts'] },
});
