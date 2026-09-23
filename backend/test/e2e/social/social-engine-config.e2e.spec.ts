/**
 * E2E do cadastro de credenciais do motor de publicação:
 *   - POST /admin/social-engine
 *   - GET  /admin/social-engine
 *   - POST /admin/social-engine/test
 *
 * O ponto destes testes é a camada HTTP: quem consegue entrar, quem não
 * consegue, e a garantia de que a chave gravada nunca sai por nenhuma rota.
 * É aqui que se prova o principal de máquina — um agente cadastrando a chave
 * sem JWT de pessoa e sem SSH em produção.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupE2E, teardownE2E } from '../../setup-e2e'
import { AppModule } from '@/app.module'
import {
  ISocialEngineGateway,
  SocialGroup,
} from '@/domain/social/application/gateways/i-social-engine.gateway'

let app: INestApplication
let adminToken: string
let employeeToken: string
let seedPrisma: PrismaClient

// Mesmo valor de vitest.config.e2e.ts: atribuir a process.env num beforeAll
// chegaria tarde, o ConfigModule já leu o ambiente no import do app.module.
const API_KEY = 'e2e-internal-key-test'

const fakeEngine: ISocialEngineGateway = {
  isConfigured: async () => true,
  uploadMedia: async () => ({ id: 'm1', path: 'https://motor.example/m.png' }),
  getPostMetrics: async () => ({ available: false, metrics: [] }),
  listQueue: async () => [],
  cancelPost: async () => {},
  publish: async () => [],
  listGroups: async (): Promise<SocialGroup[]> => [
    { id: 'g1', name: 'Padaria' },
    { id: 'g2', name: 'Bar' },
  ],
  listChannels: async () => [],
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

beforeAll(async () => {
  const { prisma } = await setupE2E()
  seedPrisma = prisma

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ISocialEngineGateway)
    .useValue(fakeEngine)
    .compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  await app.init()

  const server = app.getHttpServer()

  await request(server).post('/api/v1/auth/register').send({
    email: 'admin@engine.com', password: 'Admin123@', name: 'Admin', role: 'admin',
  })
  adminToken = (
    await request(server).post('/api/v1/auth/login')
      .send({ email: 'admin@engine.com', password: 'Admin123@' })
  ).body.accessToken

  await request(server).post('/api/v1/auth/register').send({
    email: 'emp@engine.com', password: 'Employee123@', name: 'Emp', role: 'employee',
  })
  employeeToken = (
    await request(server).post('/api/v1/auth/login')
      .send({ email: 'emp@engine.com', password: 'Employee123@' })
  ).body.accessToken
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

describe('Admin — Social Engine Config (E2E)', () => {
  describe('quem consegue entrar', () => {
    it('recusa sem credencial nenhuma', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/social-engine')
        .expect(401)
    })

    it('recusa x-api-key errada', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/social-engine')
        .set('x-api-key', 'chave-errada')
        .expect(401)
    })

    it('recusa JWT de employee — papel não autorizado', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/social-engine')
        .set(bearer(employeeToken))
        .expect(403)
    })

    it('aceita JWT de admin', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/social-engine')
        .set(bearer(adminToken))
        .expect(200)
    })

    it('aceita x-api-key — é o caminho do agente, sem JWT de pessoa', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/social-engine')
        .set('x-api-key', API_KEY)
        .expect(200)
    })
  })

  describe('cadastro', () => {
    it('um agente cadastra a chave e ela fica gravada no banco', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/social-engine')
        .set('x-api-key', API_KEY)
        .send({ apiUrl: 'https://postiz.exemplo.com/', apiKey: 'chave-do-motor-123' })
        .expect(201)

      const gravado = await seedPrisma.socialEngineConfig.findUnique({
        where: { id: 'social-engine-singleton' },
      })

      expect(gravado?.apiKey).toBe('chave-do-motor-123')
      // Barra final cortada no caminho.
      expect(gravado?.apiUrl).toBe('https://postiz.exemplo.com')
    })

    it('GET não devolve a chave em campo nenhum', async () => {
      const resp = await request(app.getHttpServer())
        .get('/api/v1/admin/social-engine')
        .set('x-api-key', API_KEY)
        .expect(200)

      expect(JSON.stringify(resp.body)).not.toContain('chave-do-motor-123')
      expect(resp.body.storedInDatabase).toBe(true)
      expect(resp.body.apiUrl).toBe('https://postiz.exemplo.com')
      expect(resp.body.keyFingerprint).toHaveLength(8)
    })

    it('recusa url sem esquema com 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/social-engine')
        .set('x-api-key', API_KEY)
        .send({ apiUrl: 'postiz.exemplo.com', apiKey: 'x' })
        .expect(400)
    })

    it('recusa chave vazia com 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/social-engine')
        .set('x-api-key', API_KEY)
        .send({ apiUrl: 'https://postiz.exemplo.com', apiKey: '  ' })
        .expect(400)
    })
  })

  describe('teste das credenciais', () => {
    it('devolve a contagem de grupos quando o motor responde', async () => {
      const resp = await request(app.getHttpServer())
        .post('/api/v1/admin/social-engine/test')
        .set('x-api-key', API_KEY)
        .expect(200)

      expect(resp.body).toEqual({ ok: true, groups: 2 })
    })
  })
})
