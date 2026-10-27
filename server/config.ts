import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

loadDotenv()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATA_SOURCE: z.enum(['appsscript', 'sheets', 'local', 'none']).default('none'),
  APPS_SCRIPT_URL: z.string().url().optional(),
  GOOGLE_SHEETS_ID: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_SHEET_GID: z.string().default('0'),
  LOCAL_DATA_FILE: z.string().optional(),
  SURVEY_URL: z.string().url().optional().or(z.literal('')),
  SURVEY_EMBED_URL: z.string().url().optional().or(z.literal('')),
  ADMIN_TOKEN: z.string().min(8, 'ADMIN_TOKEN must be at least 8 characters').optional(),
  CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),
  DEMO_MODE: z
    .enum(['auto', 'always', 'never'])
    .default('auto'),
})

export type Env = z.infer<typeof envSchema>

export interface EnvIssue {
  path: string
  message: string
}

export interface EnvValidation {
  env: Env | null
  issues: EnvIssue[]
  sourceConfigured: boolean
  warnings: string[]
}

export function validateEnv(source: NodeJS.ProcessEnv = process.env): EnvValidation {
  const parsed = envSchema.safeParse(source)
  const warnings: string[] = []

  if (!parsed.success) {
    return {
      env: null,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.') || '(root)', message: i.message })),
      sourceConfigured: false,
      warnings,
    }
  }

  const env = parsed.data
  let sourceConfigured = false

  switch (env.DATA_SOURCE) {
    case 'appsscript':
      if (!env.APPS_SCRIPT_URL) {
        warnings.push('DATA_SOURCE=appsscript but APPS_SCRIPT_URL is not set — the server will report an unconfigured source.')
      } else sourceConfigured = true
      break
    case 'sheets':
      if (!env.GOOGLE_SHEETS_ID || !env.GOOGLE_API_KEY) {
        warnings.push('DATA_SOURCE=sheets requires GOOGLE_SHEETS_ID and GOOGLE_API_KEY (publish the sheet to “anyone with the link”).')
      } else sourceConfigured = true
      break
    case 'local':
      if (!env.LOCAL_DATA_FILE) {
        warnings.push('DATA_SOURCE=local but LOCAL_DATA_FILE is not set.')
      } else sourceConfigured = true
      break
    case 'none':
      warnings.push('DATA_SOURCE=none — only empty/demo states will be served until a source is configured.')
      break
  }

  if (env.NODE_ENV === 'production' && !env.ADMIN_TOKEN) {
    warnings.push('ADMIN_TOKEN is not set — admin diagnostics endpoints will be disabled in production.')
  }

  return { env, issues: [], sourceConfigured, warnings }
}
