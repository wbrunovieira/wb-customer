import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set')
  }

  const existing = await prisma.userIdentity.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin user already exists: ${email}`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 8)
  const userId = randomUUID()

  await prisma.$transaction([
    prisma.userIdentity.create({
      data: { id: userId, email, passwordHash },
    }),
    prisma.userProfile.create({
      data: { id: randomUUID(), userId, name: 'Admin' },
    }),
    prisma.userAuthorization.create({
      data: { id: randomUUID(), userId, role: 'admin' },
    }),
  ])

  console.log(`Admin user created: ${email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
