# CLOUDYGETTY-AI — Universal GOD-MODE Specifications

# Sentinel Engine v6.0 · ENTROPY-ZERO

# Applies to every repo in the cloudygetty-ai organization.

# This is the single source of truth for all implementations, patterns, and contracts.

# Claude Code reads this file on every session across every repo.

-----

## HOW TO USE THIS FILE

This file lives at the org level and is referenced by every repo's CLAUDE.md.
It defines the universal implementation patterns, stack contracts, and code
standards that apply across all cloudygetty-ai projects.

Per-repo SPECS.md files extend this document with repo-specific implementations.

Claude Code workflow:

1. Read CLAUDE.md — load operational persona + repo constraints
1. Read this file — load universal patterns + org standards
1. Read PROJECT.md — load repo-specific state + file map
1. Read repo SPECS.md (if exists) — load repo-specific implementations
1. Scaffold, implement, verify, commit, push

-----

## ORG REGISTRY

```
cloudygetty-ai — active repositories:

ACTIVE — in production or active development
├── ANL              AllNightLong dating app
│                    RN/Expo + Express + PostGIS + Socket.io + LiveKit + Stripe
│                    5 patent-candidate features · Fly.io deploy
│
├── game-on          Real-money skill gaming platform
│                    RN/Expo + Express monorepo · 8 games · Socket.io rooms
│                    Stripe wallet · KYC · Tournament system · Fly.io
│
├── VAULT            WireGuard VPN app
│                    RN client + Web dashboard + bash server bootstrap
│                    Stripe billing · keypair registration · kill switch
│
├── luminary         AI image generation playground
│                    Gemini via Vercel AI Gateway · batch gen · style presets
│                    LLM prompt enhancement · A/B comparison · inpainting
│
├── FORGE            Groq-backed LLM chat UI
│                    Llama 3.3 70B · dark luxury terminal aesthetic
│                    Obsidian/gold · Cinzel · DM Mono · system prompt tuned
│
├── don't-reneg-on-me  Spades card game (formerly SpadesRoyale)
│                    Vite/React + RN · dark luxury casino UI
│                    Cinzel Decorative · obsidian/felt palette · gold shimmer
│
├── open-up-app      Social app
│                    React/Node/Prisma/JWT · Next.js · Vercel
│
├── crowned-lion     PWA social casino
│                    Plain JS · HTML5 Canvas · NJ-compliant · no framework
│
├── precrime         Static analysis + correctness engine
│                    Go orchestration · Rust hot-path · TS/Go/Python targets
│                    Contract Graph · Suspicion Engine · Reality Check layer
│                    FinTech primary market · Audit/Gate/Org tiers
│
├── echo             Programming language + Vite plugin
│                    esbuild compiler · JSX-like syntax · $ reactive state
│                    Outputs: React Native components or plain JS/TS
│
├── CLAUDE           Autonomous dev environment
│                    RN/TS · Zustand · Entropy-Zero V3.0
│                    Self-healing protocols · strict modularity
│
├── vaultify         Auth-as-a-service
│                    JWT/OAuth/Redis/Prisma · proprietary platform
│
├── PROXM            Location-based discovery
│                    PostGIS · view-once · 2FA
│
├── hole-eaters      Location social
│                    WebRTC · Claude API integration
│
└── zero-to-one      Startup SPA
                     ConvertKit · Lemon Squeezy
```

-----

## UNIVERSAL STACK

### Languages

```
TypeScript 5.x strict mode — all repos except:
  crowned-lion → plain JS only
  precrime → Go (orchestration) + Rust (hot-path) + TS (client)
  echo → TypeScript (compiler output configurable)
```

### Frontend

```
Mobile:       React Native + Expo SDK 51+
Web:          React 18 + Vite or Next.js 14+
State:        Zustand
Data:         TanStack Query v5
Validation:   Zod
Animation:    Reanimated 3 (RN) / Framer Motion (web)
```

### Backend

```
Runtime:      Node.js 20 LTS
Framework:    Express (primary) / Fastify (performance-critical)
ORM:          Prisma 5+
DB:           PostgreSQL 15 + PostGIS 3.3
Cache:        Redis 7
Auth:         Supabase Auth (primary) / Vaultify (internal)
Realtime:     Socket.io 4 (sticky sessions required on Fly)
Storage:      AWS S3 (presigned URLs — never serve directly)
Payments:     Stripe
Video:        LiveKit WebRTC
Push:         Expo Notifications (mobile)
```

### Infrastructure

```
API deploy:   Fly.io (primary) — region ewr (Newark)
Web deploy:   Vercel
DB:           Supabase (PostgreSQL + PostGIS)
CI/CD:        GitHub Actions
Monitoring:   Sentry (errors) + PostHog (product analytics)
Container:    Docker multi-stage non-root
```

### Testing

```
Unit:         Vitest (preferred) / Jest
E2E:          Playwright (web) / Detox (RN)
API:          Supertest
```

-----

## UNIVERSAL AESTHETIC SYSTEM

Applies to ALL UI output across ALL repos. Non-negotiable.

```typescript
// Universal design tokens — extend per repo, never override core values

export const colors = {
  // Core — obsidian base
  bg:           '#0D0A14',   // primary background
  bgElevated:   '#13101C',   // elevated surface
  bgCard:       '#1A1625',   // card/panel surface
  border:       '#2A2040',   // primary border
  borderSubtle: '#1E1830',   // subtle separator

  // Accents — gold or violet (repo-specific)
  gold:         '#C9A84C',   // ANL, FORGE, VAULT, game-on
  violet:       '#8B5CF6',   // ANL alternate, CLAUDE
  crimson:      '#9B2335',   // don't-reneg-on-me (felt/casino)
  emerald:      '#10B981',   // success states universal

  // Text
  text:         '#F0EBF8',   // primary text
  textMuted:    '#7B6B9A',   // secondary text
  textDim:      '#4A3D66',   // disabled/placeholder

  // Semantic
  danger:       '#EF4444',
  warning:      '#F59E0B',
  success:      '#10B981',
  info:         '#3B82F6',
} as const

export const fonts = {
  display:  'Cinzel-Regular',          // headings, wordmarks
  displayB: 'Cinzel-Bold',             // hero text, scores
  ui:       'DMMono-Regular',          // body, labels, data
  uiM:      'DMMono-Medium',           // buttons, badges
  // don't-reneg-on-me override:
  casino:   'Cinzel Decorative',       // card game titles
} as const

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const

export const radius = {
  sm: 4, md: 8, lg: 16, full: 9999,
} as const

export const shadows = {
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  glow: (color: string) => ({ shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 }),
} as const
```

-----

## UNIVERSAL AUTH PATTERN

All repos use this pattern. Stack may vary (Supabase / Vaultify / JWT) but contracts are identical.

### REST Auth Middleware

```typescript
// src/middleware/auth.ts — universal pattern
import { Request, Response, NextFunction } from 'express'

export interface AuthRequest extends Request {
  userId: string
  userEmail: string
}

// Implementation varies by repo auth provider:
// Supabase: supabaseAdmin.auth.getUser(token)
// Vaultify: vaultify.verify(token)
// JWT:      jwt.verify(token, env.JWT_SECRET)
export async function requireAuth(
  req: Request, res: Response, next: NextFunction
) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }
  const token = authHeader.slice(7)
  // verify token with repo auth provider
  // attach userId and userEmail to request
  // call next() or return 401
}
```

### Socket.io Auth Middleware

```typescript
// src/middleware/socketAuth.ts — universal pattern
import { Socket } from 'socket.io'

export interface AuthSocket extends Socket {
  userId: string
}

export async function socketAuthMiddleware(
  socket: Socket, next: (err?: Error) => void
) {
  const token = socket.handshake.auth?.token as string | undefined
  if (!token) return next(new Error('AUTH_MISSING'))
  // verify token — same provider as REST
  // attach userId to socket
  // call next() or next(new Error('AUTH_INVALID'))
}
```

-----

## UNIVERSAL ENV VALIDATION

All repos validate environment at boot. App never starts with missing vars.

```typescript
// src/config/env.ts — universal pattern
import { z } from 'zod'

// Define schema with all required vars for this repo
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  // ... repo-specific vars
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('ENV VALIDATION FAILED — server will not start')
  console.error(parsed.error.format())
  process.exit(1)
}

export const env = parsed.data
```

-----

## UNIVERSAL RATE LIMITING

```typescript
// src/middleware/rateLimit.ts — universal pattern
import rateLimit from 'express-rate-limit'

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts' },
})

// Add repo-specific limiters as needed
// e.g. mediaLimiter, aiLimiter, gameLimiter
```

-----

## UNIVERSAL HEALTH ENDPOINT

Every repo exposes `/health`. Required for Fly.io healthcheck.

```typescript
// src/routes/health.ts — universal pattern
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { env } from '../config/env'

const router = Router()

router.get('/health', async (_req, res) => {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
      services: { db: { status: 'ok', latency_ms: Date.now() - start } },
    })
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      services: { db: { status: 'error', error: (err as Error).message } },
    })
  }
})

export default router
```

-----

## UNIVERSAL PRISMA PATTERN

```typescript
// src/lib/prisma.ts — universal pattern
import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

-----

## UNIVERSAL EXPRESS APP PATTERN

```typescript
// src/app.ts — universal pattern
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { globalLimiter } from './middleware/rateLimit'
import { env } from './config/env'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))

// Stripe webhook must come BEFORE express.json()
// app.use('/payments/webhook', express.raw({ type: 'application/json' }))

app.use(express.json({ limit: '10kb' }))
app.use(globalLimiter)

// Mount routes here

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Express]', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
```

-----

## UNIVERSAL SERVER ENTRY POINT

```typescript
// src/index.ts — universal pattern
import './config/env'
import http from 'http'
import app from './app'
import { env } from './config/env'

const httpServer = http.createServer(app)

// Optional: attach Socket.io
// import { createSocketServer } from './socket'
// const io = createSocketServer(httpServer)
// app.set('io', io)

httpServer.listen(env.PORT, () => {
  console.log(`[${process.env.npm_package_name}] [${env.NODE_ENV}] port ${env.PORT}`)
})

const shutdown = (signal: string) => {
  console.log(`${signal} — graceful shutdown`)
  httpServer.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
```

-----

## UNIVERSAL DOCKERFILE

```dockerfile
# Multi-stage · non-root · Alpine · OpenSSL for Prisma
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/package.json ./
USER app
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

-----

## UNIVERSAL FLY.TOML

```toml
# Replace APP_NAME with repo name
app = "APP_NAME"
primary_region = "ewr"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

  [http_service.concurrency]
    type = "connections"
    hard_limit = 500
    soft_limit = 200

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1

[checks]
  [checks.health]
    grace_period = "10s"
    interval = "30s"
    method = "GET"
    path = "/health"
    port = 3000
    timeout = "5s"
    type = "http"
```

-----

## UNIVERSAL GITHUB ACTIONS

```yaml
# .github/workflows/deploy.yml — universal pattern
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npx prisma generate
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
        env:
          NODE_ENV: test
          # repo-specific test env vars

      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

-----

## UNIVERSAL ERROR BOUNDARY (React Native)

Required on every screen root in every RN repo.

```typescript
// src/components/ErrorBoundary.tsx — universal
import React, { Component, ReactNode } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface Props { children: ReactNode; fallback?: ReactNode; onError?: (error: Error) => void }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack)
    this.props.onError?.(error)
    // TODO[P1]: wire to Sentry
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <View style={s.container}>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.message}>{this.state.error?.message}</Text>
          <TouchableOpacity style={s.button} onPress={this.reset}>
            <Text style={s.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return this.props.children
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0A14', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontFamily: 'Cinzel-Regular', fontSize: 20, color: '#C9A84C', marginBottom: 12 },
  message: { fontFamily: 'DMMono-Regular', fontSize: 13, color: '#6B5B7B', textAlign: 'center', marginBottom: 32 },
  button: { borderWidth: 1, borderColor: '#C9A84C', paddingHorizontal: 32, paddingVertical: 12 },
  buttonText: { fontFamily: 'DMMono-Regular', fontSize: 13, color: '#C9A84C', letterSpacing: 2 },
})
```

-----

## UNIVERSAL API CLIENT (React Native / Web)

```typescript
// src/lib/api.ts — universal pattern
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? ''

class ApiClient {
  private token: string | null = null

  setToken(token: string) { this.token = token }
  clearToken() { this.token = null }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error ?? `HTTP ${res.status}`)
    }

    return res.json()
  }

  get<T>(path: string) { return this.request<T>('GET', path) }
  post<T>(path: string, body?: unknown) { return this.request<T>('POST', path, body) }
  patch<T>(path: string, body?: unknown) { return this.request<T>('PATCH', path, body) }
  delete<T>(path: string) { return this.request<T>('DELETE', path) }
}

export const api = new ApiClient()
```

-----

## UNIVERSAL ZUSTAND STORE PATTERN

```typescript
// src/store/index.ts — universal pattern
import { create } from 'zustand'

// Every store follows this shape:
// - state fields (typed)
// - actions (synchronous state updates)
// - async operations called from components, NOT stored as actions

interface AppState {
  // Auth
  userId: string | null
  token: string | null

  // UI
  isLoading: boolean
  error: string | null

  // Actions
  setAuth: (userId: string, token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  userId: null,
  token: null,
  isLoading: false,
  error: null,

  setAuth: (userId, token) => set({ userId, token }),
  clearAuth: () => set({ userId: null, token: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
```

-----

## UNIVERSAL SOCKET.IO CLIENT HOOK

```typescript
// src/hooks/useSocket.ts — universal pattern
import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '../store'

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL ?? ''

export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null)
  const { token } = useAppStore()

  useEffect(() => {
    if (!token) return

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => console.log('[Socket] Connected'))
    socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason))
    socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message))

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  return socketRef.current
}
```

-----

## UNIVERSAL S3 PATTERN

```typescript
// src/services/s3.service.ts — universal pattern
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env'
import { randomUUID } from 'crypto'

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
})

export async function getPresignedUploadUrl(
  userId: string,
  folder: string,       // e.g. 'profile', 'media', 'audio'
  contentType: string,
  expiresIn = 300       // 5 min default
) {
  const ext = contentType.split('/')[1] ?? 'bin'
  const objectKey = `${folder}/${userId}/${randomUUID()}.${ext}`
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: objectKey,
    ContentType: contentType,
    Metadata: { uploadedBy: userId },
  })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn })
  const publicUrl = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${objectKey}`
  return { uploadUrl, objectKey, publicUrl }
}

export async function getS3Object(objectKey: string): Promise<Buffer | null> {
  try {
    const response = await s3.send(new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: objectKey }))
    const stream = response.Body as NodeJS.ReadableStream
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    return Buffer.concat(chunks)
  } catch { return null }
}

export async function deleteS3Object(objectKey: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: objectKey }))
}
```

-----

## UNIVERSAL STRIPE WEBHOOK PATTERN

```typescript
// src/routes/payments.ts — universal Stripe webhook pattern
import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { env } from '../config/env'

const router = Router()
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

// CRITICAL: Must be registered BEFORE express.json() in app.ts
// app.use('/payments/webhook', express.raw({ type: 'application/json' }))
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature' })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[Stripe] Webhook signature failed:', (err as Error).message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    await handleStripeEvent(event)
    res.json({ received: true })
  } catch (err) {
    console.error('[Stripe] Handler failed:', err)
    res.status(500).json({ error: 'Handler failed' })
  }
})

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      // handle payment
      break
    case 'customer.subscription.deleted':
      // handle cancellation
      break
    default:
      console.log(`[Stripe] Unhandled: ${event.type}`)
  }
}

export default router
```

-----

## UNIVERSAL PUSH NOTIFICATION PATTERN

```typescript
// src/hooks/usePushNotifications.ts — universal RN pattern
import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { api } from '../lib/api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export function usePushNotifications() {
  useEffect(() => { register() }, [])

  const register = async () => {
    if (!Device.isDevice) return

    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      })
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    })

    await api.post('/push/register', { token }).catch(console.error)
  }
}
```

-----

## UNIVERSAL LOCATION HOOK

```typescript
// src/hooks/useLocation.ts — universal RN pattern
import { useEffect, useRef } from 'react'
import * as Location from 'expo-location'
import { useSocket } from './useSocket'

export function useLocation() {
  const socket = useSocket()
  const watchRef = useRef<Location.LocationSubscription | null>(null)

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return

    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 50 },
      (location) => {
        socket?.emit('presence:location', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        })
      }
    )
  }

  const stopTracking = () => {
    watchRef.current?.remove()
    watchRef.current = null
  }

  useEffect(() => () => stopTracking(), [])

  return { startTracking, stopTracking }
}
```

-----

## UNIVERSAL ACTIVITY TRACKING HOOK

```typescript
// src/hooks/useActivityTracking.ts — universal RN pattern
// Powers CCS (Circadian Compatibility Score) signal accumulation
import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useSocket } from './useSocket'

export function useActivityTracking() {
  const socket = useSocket()
  const appState = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current === 'background' && nextState === 'active') {
        socket?.emit('app:foreground')
      } else if (nextState === 'background') {
        socket?.emit('app:background')
      }
      appState.current = nextState
    })
    return () => sub.remove()
  }, [socket])
}
```

-----

## UNIVERSAL ROOT LAYOUT PATTERN (Expo)

```typescript
// app/_layout.tsx — universal Expo root layout
import { ErrorBoundary } from '../src/components/ErrorBoundary'
import { useActivityTracking } from '../src/hooks/useActivityTracking'
import { usePushNotifications } from '../src/hooks/usePushNotifications'

export default function RootLayout() {
  // Wire universal hooks
  useActivityTracking()    // CCS signal accumulation
  usePushNotifications()   // push token registration

  return (
    <ErrorBoundary>
      {/* repo-specific navigator */}
    </ErrorBoundary>
  )
}
```

-----

## UNIVERSAL TSCONFIG

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

-----

## UNIVERSAL PACKAGE.JSON SCRIPTS

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --project tsconfig.build.json",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx --fix",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "db:push": "prisma db push"
  }
}
```

-----

## UNIVERSAL .GITIGNORE

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build
dist/
build/
.expo/
.next/

# Environment
.env
.env.local
.env.production
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage/
.nyc_output/

# Prisma
prisma/*.db
prisma/*.db-journal

# Expo
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
```

-----

## UNIVERSAL SECURITY CHECKLIST

Applied to every new repo and every PR:

```
AUTH
[ ] All routes behind requireAuth middleware
[ ] Socket.io behind socketAuthMiddleware
[ ] Auth errors return 401 with no detail leakage
[ ] Token expiry handled gracefully on client

INPUT VALIDATION
[ ] Zod schema on every request body
[ ] Type coercion for numeric query params
[ ] Array length limits on all bulk operations
[ ] File type + size validation on all uploads

SECRETS
[ ] All secrets in env vars — never in source
[ ] .env in .gitignore — committed only .env.example
[ ] Secrets set via fly secrets — never in fly.toml
[ ] No secrets in logs or error messages

RATE LIMITING
[ ] globalLimiter on all routes
[ ] authLimiter on auth routes
[ ] Custom limiters on expensive operations

HEADERS
[ ] helmet() applied in app.ts
[ ] CORS origin locked to known domains
[ ] force_https = true in fly.toml

DATABASE
[ ] No raw string interpolation in queries
[ ] Prisma parameterized queries always
[ ] PostGIS raw queries use tagged template literals
[ ] Connection pool sized to VM capacity
```

-----

## UNIVERSAL PERFORMANCE CHECKLIST

```
DATABASE
[ ] EXPLAIN ANALYZE run on all new queries
[ ] Indexes on all foreign keys
[ ] GIST indexes on all PostGIS geometry columns
[ ] Prisma select only required fields (no select *)
[ ] Pagination on all list endpoints

REACT NATIVE
[ ] No blocking operations on JS thread
[ ] Reanimated 3 for all animations
[ ] FlatList with getItemLayout for long lists
[ ] useMemo on expensive computations
[ ] useCallback on all event handlers passed as props
[ ] Images lazy loaded with proper cache headers

BACKEND
[ ] Promise.all for parallel independent operations
[ ] Never await in a loop (use Promise.all)
[ ] Redis cache for expensive repeated queries
[ ] Response compression (compression middleware)
[ ] Keep-alive connections to DB pool
```

-----

## UNIVERSAL TELEMETRY CONTRACT

Every non-trivial module must answer at runtime:

```typescript
// Telemetry interface — every service implements this
interface TelemetrySignals {
  // HEALTH — Am I alive?
  health(): Promise<{ status: 'ok' | 'degraded' | 'dead'; latency_ms: number }>

  // PRESSURE — How hard am I working?
  pressure(): { requestsPerMin: number; avgLatency_ms: number; queueDepth: number }

  // EFFICIENCY — What am I leaking?
  efficiency(): { memoryMB: number; openHandles: number; cacheHitRate: number }

  // FAILURE — What went wrong?
  // Emit structured errors: { code, message, context, timestamp, traceId }

  // TRACE — Where am I in execution?
  // Propagate traceId through all async boundaries
}
```

-----

## REPO-SPECIFIC OVERRIDES

### ANL — AllNightLong

```
Auth:     Supabase (anonymous-first)
DB:       PostgreSQL + PostGIS (spatial queries mandatory)
Deploy:   Fly.io ewr region
Accent:   Gold (#C9A84C) primary, Violet (#8B5CF6) secondary
Special:  5 patent features — VCMS+ pipeline — do not modify weights without instruction
Patents:  CCS + VAS + VCS + Cryptographic Mutual Reveal + Social Graph Exclusion
VCMS+:    Proximity(0.35) + CCS(0.25) + VAS(0.25) + VCS(0.15)
```

### game-on

```
Auth:     JWT (custom)
DB:       PostgreSQL + Prisma
Deploy:   Fly.io
Special:  Real-money gaming — KYC required — Stripe escrow wallet
Games:    8 games — tournament system — 3-tier paywall (Free/Plus/Premium)
Accent:   Gold (#C9A84C)
```

### VAULT

```
Auth:     JWT + WireGuard keypair
DB:       PostgreSQL + Prisma
Deploy:   Fly.io
Special:  WireGuard peer management — kill switch — libsodium keypair
Accent:   Gold (#C9A84C)
```

### luminary

```
Auth:     Supabase
Deploy:   Vercel (AI Gateway)
Special:  Gemini API — batch generation — no traditional DB needed
Accent:   Violet (#8B5CF6)
```

### FORGE

```
Auth:     Supabase
Deploy:   Vercel
Special:  Groq API (Llama 3.3 70B) — terminal aesthetic — system prompt tuned for cloudygetty-ai stack
Accent:   Gold (#C9A84C)
```

### don't-reneg-on-me

```
Auth:     Supabase
Deploy:   Vercel
Special:  Card game rules engine — felt/casino aesthetic — Cinzel Decorative font
Accent:   Crimson (#9B2335) on felt green
```

### precrime

```
Lang:     Go (orchestration) + Rust (hot-path) + TypeScript (client)
Deploy:   Fly.io
Special:  Static analysis engine — Contract Graph — Suspicion Engine — Reality Check
Market:   FinTech primary — Audit/Gate/Org tiers
No RN, no Prisma, no Supabase
```

### echo

```
Lang:     TypeScript (compiler) — output configurable
Deploy:   npm package
Special:  Vite plugin — esbuild backend — JSX-like syntax — $ reactive prefix
No backend, no DB, no auth
```

### crowned-lion

```
Lang:     Plain JS only — no TypeScript — no framework
Deploy:   Vercel (static)
Special:  HTML5 Canvas — PWA — NJ-compliant social casino
No React, no Node, no Prisma
```

-----

## DEPLOYMENT COMMANDS REFERENCE

```bash
# Fly.io — new repo
fly launch --no-deploy --name REPO_NAME --region ewr
fly secrets set KEY=value KEY2=value2
fly deploy

# Fly.io — existing repo
fly deploy
fly logs
fly status
curl https://REPO_NAME.fly.dev/health

# Vercel — new repo
vercel --prod

# Database
npx prisma migrate dev --name migration_name   # development
npx prisma migrate deploy                       # production (runs in Dockerfile CMD)
npx prisma generate                             # after schema changes
npx prisma studio                               # GUI

# GitHub push pattern (every session must end with this)
git add .
git commit -m "feat(scope): description"
git push origin main
```

-----

## COMMIT MESSAGE FORMAT

All repos use conventional commits:

```
feat(scope): add new feature
fix(scope): fix bug
chore(scope): maintenance, deps, config
refactor(scope): code improvement without behavior change
perf(scope): performance improvement
test(scope): add or update tests
docs(scope): documentation update
security(scope): security fix

scope = repo area: auth, api, ui, db, infra, socket, patent, etc.

Examples:
  feat(anl/ccs): add confidence decay for stale profiles
  fix(game-on/wallet): prevent double-charge on network retry
  chore(vault/deps): upgrade livekit-server-sdk to 2.0
  security(anl/auth): add rate limit to reveal endpoint
```

-----

## SESSION END CHECKLIST

Every Claude Code session ends with:

```
[ ] All new files typechecked (npx tsc --noEmit)
[ ] All new routes tested (curl or Supertest)
[ ] No console.log left in production paths
[ ] Error boundaries on all new RN screens
[ ] Telemetry wired on all new services
[ ] .env.example updated if new vars added
[ ] PROJECT.md updated with new file entries
[ ] TODO.md updated — completed tasks checked, new tasks added
[ ] git add . && git commit -m "..." && git push origin main
```

-----

*CLOUDYGETTY-AI UNIVERSAL SPECS v1.0*
*Sentinel Engine v6.0 · ENTROPY-ZERO*
*Applies org-wide. Every repo. Every session.*
*Last updated: 2026-05-16*
