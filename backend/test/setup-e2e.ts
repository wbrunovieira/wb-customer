import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'

// Capture the original DATABASE_URL before any test modifies process.env
const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL!

let prisma: PrismaClient
let schemaName: string

export async function setupE2E() {
  // Generate a short schema name: "t" + first 8 chars of UUID (no dashes)
  const shortId = randomUUID().replace(/-/g, '').slice(0, 16)
  schemaName = `t_${shortId}`

  // Always build the schema URL from the original base URL (not a previously modified one)
  const baseUrl = ORIGINAL_DATABASE_URL.split('?')[0]
  const schemaUrl = `${baseUrl}?schema=${schemaName}`

  process.env.DATABASE_URL = schemaUrl
  // STORAGE_ADAPTER e CALENDAR_ADAPTER NÃO são definidos aqui: seria tarde.
  // ConfigModule.forRoot() lê o .env no import do app.module, antes deste
  // beforeAll, então uma atribuição aqui não muda o que o app já leu. Ficam em
  // vitest.config.e2e.ts, que entra em vigor antes de qualquer import.
  // DATABASE_URL é exceção: o PrismaService resolve a URL na conexão, não no
  // import, então esta atribuição ainda alcança.

  prisma = new PrismaClient({
    datasources: { db: { url: schemaUrl } },
  })

  await prisma.$connect()
  await prisma.$executeRawUnsafe(
    `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`,
  )

  execSync(`pnpm prisma migrate deploy`, {
    env: { ...process.env, DATABASE_URL: schemaUrl },
    stdio: 'pipe',
  })

  return { prisma, schemaUrl }
}

export async function teardownE2E() {
  if (prisma) {
    await prisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
    )
    await prisma.$disconnect()
  }
}
