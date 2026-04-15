import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UnauthorizedException } from '@nestjs/common'
import { EvolutionController } from './evolution.controller'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockConfig = {
  get: vi.fn((key: string) => {
    const map: Record<string, string> = {
      EVOLUTION_WEBHOOK_SECRET: 'test-wh-secret',
      CRON_SECRET: 'test-cron-secret',
    }
    return map[key]
  }),
}

const mockWebhookService = {
  process: vi.fn(),
  recordSentMessage: vi.fn(),
}

const mockMediaService = {
  pollTranscriptions: vi.fn(),
}

const mockEvolutionClient = {
  sendText: vi.fn(),
}

const fakeUser = { userId: 'agent-1' }

function makeController() {
  return new EvolutionController(
    mockConfig as never,
    mockWebhookService as never,
    mockMediaService as never,
    mockEvolutionClient as never,
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('EvolutionController.webhook', () => {
  let ctrl: EvolutionController

  beforeEach(() => {
    vi.clearAllMocks()
    ctrl = makeController()
  })

  it('should throw UnauthorizedException when secret is wrong', async () => {
    await expect(ctrl.webhook('bad-secret', {})).rejects.toThrow(UnauthorizedException)
    expect(mockWebhookService.process).not.toHaveBeenCalled()
  })

  it('should return ok:true and fire-and-forget with correct secret', async () => {
    mockWebhookService.process.mockResolvedValue(undefined)
    const result = await ctrl.webhook('test-wh-secret', { event: 'connection.update' })
    expect(result).toEqual({ ok: true })
  })
})

describe('EvolutionController.checkTranscriptions', () => {
  let ctrl: EvolutionController

  beforeEach(() => {
    vi.clearAllMocks()
    ctrl = makeController()
    mockMediaService.pollTranscriptions.mockResolvedValue(undefined)
  })

  it('should throw UnauthorizedException when cron secret is wrong', async () => {
    await expect(ctrl.checkTranscriptions('bad-secret')).rejects.toThrow(UnauthorizedException)
  })

  it('should return ok:true with correct cron secret', async () => {
    const result = await ctrl.checkTranscriptions('test-cron-secret')
    expect(result).toEqual({ ok: true })
  })
})

describe('EvolutionController.send', () => {
  let ctrl: EvolutionController

  beforeEach(() => {
    vi.clearAllMocks()
    ctrl = makeController()
    mockWebhookService.recordSentMessage.mockResolvedValue({ activityId: 'act-sent' })
  })

  it('should call evolutionClient.sendText with the correct phone and text', async () => {
    mockEvolutionClient.sendText.mockResolvedValue({ messageId: 'msg-out-1' })

    await ctrl.send('cust-1', { to: '5511999998888', text: 'Olá' }, fakeUser)

    expect(mockEvolutionClient.sendText).toHaveBeenCalledWith('5511999998888', 'Olá')
  })

  it('should call webhookService.recordSentMessage after a successful send', async () => {
    mockEvolutionClient.sendText.mockResolvedValue({ messageId: 'msg-out-1' })

    await ctrl.send('cust-1', { to: '5511999998888', text: 'Olá' }, fakeUser)

    expect(mockWebhookService.recordSentMessage).toHaveBeenCalledOnce()
    expect(mockWebhookService.recordSentMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        remoteJid: '5511999998888@s.whatsapp.net',
        messageId: 'msg-out-1',
        text: 'Olá',
        createdByUserId: 'agent-1',
      }),
    )
  })

  it('should return ok:true and messageId on success', async () => {
    mockEvolutionClient.sendText.mockResolvedValue({ messageId: 'msg-out-1' })

    const result = await ctrl.send('cust-1', { to: '5511999998888', text: 'Olá' }, fakeUser)

    expect(result).toEqual({ ok: true, messageId: 'msg-out-1' })
  })

  it('should return ok:false and NOT call recordSentMessage when Evolution returns null', async () => {
    mockEvolutionClient.sendText.mockResolvedValue(null)

    const result = await ctrl.send('cust-1', { to: '5511999998888', text: 'Olá' }, fakeUser)

    expect(result).toEqual({ ok: false, messageId: undefined })
    expect(mockWebhookService.recordSentMessage).not.toHaveBeenCalled()
  })

  it('should format JID correctly for phone numbers already in E.164 style', async () => {
    mockEvolutionClient.sendText.mockResolvedValue({ messageId: 'msg-out-2' })

    await ctrl.send('cust-1', { to: '+5511999998888', text: 'Hi' }, fakeUser)

    expect(mockWebhookService.recordSentMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteJid: '+5511999998888@s.whatsapp.net',
      }),
    )
  })
})
