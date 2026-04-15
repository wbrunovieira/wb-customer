import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  SEED_ADMIN_EMAIL: z.string().email(),
  SEED_ADMIN_PASSWORD: z.string().min(8),
  STORAGE_ADAPTER: z.enum(['local', 'google-drive']).default('local'),
  CALENDAR_ADAPTER: z.enum(['mock', 'google-calendar']).default('mock'),
  // Google OAuth (optional — required only when CALENDAR_ADAPTER=google-calendar or Gmail enabled)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  // Transcription service (optional)
  TRANSCRIPTOR_BASE_URL: z.string().url().optional(),
  TRANSCRIPTOR_API_KEY: z.string().optional(),
  // GoTo Connect (optional — required for VoIP integration)
  GOTO_CLIENT_ID: z.string().optional(),
  GOTO_CLIENT_SECRET: z.string().optional(),
  GOTO_ACCOUNT_KEY: z.string().optional(),
  GOTO_WEBHOOK_SECRET: z.string().optional(),
  GOTO_DEFAULT_OWNER_ID: z.string().optional(),
  GOTO_ACCESS_TOKEN: z.string().optional(),
  GOTO_REFRESH_TOKEN: z.string().optional(),
  GOTO_TOKEN_EXPIRES_AT: z.string().optional(),
  // WhatsApp via Evolution API (optional)
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE: z.string().optional(),
  EVOLUTION_WEBHOOK_SECRET: z.string().optional(),
  EVOLUTION_OWNER_ID: z.string().optional(),
  // Internal security
  CRON_SECRET: z.string().optional(),
  INTERNAL_API_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>
