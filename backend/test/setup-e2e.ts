import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient
let schemaName: string

export async function setupE2E() {
  schemaName = `test_${randomUUID().replace(/-/g, '_')}`

  const baseUrl = process.env.DATABASE_URL!
  const schemaUrl = `${baseUrl}?schema=${schemaName}`

  process.env.DATABASE_URL = schemaUrl

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
