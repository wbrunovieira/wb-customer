import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WhatsAppWebhookService, EvolutionWebhookPayload } from './whatsapp-webhook.service'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockWhatsAppMessageFindUnique = vi.fn()
const mockActivityFindFirst = vi.fn()
const mockActivityCreate = vi.fn()
const mockActivityUpdate = vi.fn()
const mockWhatsAppMessageCreate = vi.fn()

const mockPrisma = {
  whatsAppMessage: {
    findUnique: mockWhatsAppMessageFindUnique,
    create: mockWhatsAppMessageCreate,
  },
  activity: {
    findFirst: mockActivityFindFirst,
    create: mockActivityCreate,
    update: mockActivityUpdate,
  },
}

const mockPhoneMatcher = {
  match: vi.fn(),
}

const mockMediaService = {
  process: vi.fn().mockResolvedValue(undefined),
}

const mockNotifications = {
  pushBroadcast: vi.fn(),
}

function makePayload(overrides: Partial<EvolutionWebhookPayload> = {}): EvolutionWebhookPayload {
  return {
    event: 'messages.upsert',
    key: { id: 'msg-1', remoteJid: '5511999998888@s.whatsapp.net', fromMe: false },
    pushName: 'João Silva',
    messageType: 'conversation',
    message: { conversation: 'Olá, tudo bem?' },
    messageTimestamp: Math.floor(Date.now() / 1000),
    ...overrides,
  }
}

let sut: WhatsAppWebhookService

beforeEach(() => {
  vi.clearAllMocks()
  sut = new WhatsAppWebhookService(
    mockPrisma as never,
    mockPhoneMatcher as never,
    mockMediaService as never,
    mockNotifications as never,
  )
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('WhatsAppWebhookService.recordSentMessage', () => {
  const REMOTE_JID = '5511999998888@s.whatsapp.net'

  describe('new session (no open activity within 2h)', () => {
    beforeEach(() => {
      mockActivityFindFirst.mockResolvedValueOnce(null)
      mockActivityCreate.mockResolvedValueOnce({ id: 'act-sent-new' })
      mockWhatsAppMessageCreate.mockResolvedValueOnce({ id: 'wm-sent' })
    })

    it('should create a new whatsapp activity', async () => {
      await sut.recordSentMessage({
        customerId: 'cust-1',
        remoteJid: REMOTE_JID,
        messageId: 'msg-sent-1',
        text: 'Olá',
        createdByUserId: 'agent-1',
      })

      expect(mockActivityCreate).toHaveBeenCalledOnce()
      expect(mockActivityCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'cust-1',
            type: 'whatsapp',
            status: 'open',
          }),
        }),
      )
    })

    it('should create WhatsAppMessage with fromMe=true and senderName="Você"', async () => {
      await sut.recordSentMessage({
        customerId: 'cust-1',
        remoteJid: REMOTE_JID,
        messageId: 'msg-sent-1',
        text: 'Olá',
        createdByUserId: 'agent-1',
      })

      expect(mockWhatsAppMessageCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            messageId: 'msg-sent-1',
            remoteJid: REMOTE_JID,
            fromMe: true,
            senderName: 'Você',
            text: 'Olá',
          }),
        }),
      )
    })

    it('should return the new activityId', async () => {
      const result = await sut.recordSentMessage({
        customerId: 'cust-1',
        remoteJid: REMOTE_JID,
        messageId: 'msg-sent-1',
        text: 'Olá',
        createdByUserId: 'agent-1',
      })

      expect(result).toEqual({ activityId: 'act-sent-new' })
    })

    it('should push SSE broadcast for sent message', async () => {
      await sut.recordSentMessage({
        customerId: 'cust-1',
        remoteJid: REMOTE_JID,
        messageId: 'msg-sent-1',
        text: 'Olá',
        createdByUserId: 'agent-1',
      })

      expect(mockNotifications.pushBroadcast).toHaveBeenCalledOnce()
      expect(mockNotifications.pushBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'activity.whatsapp',
          meta: expect.objectContaining({ customerId: 'cust-1' }),
        }),
      )
    })
  })

  describe('existing session (open activity within 2h)', () => {
    beforeEach(() => {
      mockActivityFindFirst.mockResolvedValueOnce({ id: 'act-open', description: 'linha anterior' })
      mockActivityUpdate.mockResolvedValueOnce({})
      mockWhatsAppMessageCreate.mockResolvedValueOnce({ id: 'wm-sent-2' })
    })

    it('should NOT create a new activity, should update existing', async () => {
      await sut.recordSentMessage({
        customerId: 'cust-1',
        remoteJid: REMOTE_JID,
        messageId: 'msg-sent-2',
        text: 'Resposta',
        createdByUserId: 'agent-1',
      })

      expect(mockActivityCreate).not.toHaveBeenCalled()
      expect(mockActivityUpdate).toHaveBeenCalledOnce()
    })

    it('should append the sent message line to existing description', async () => {
      await sut.recordSentMessage({
        customerId: 'cust-1',
        remoteJid: REMOTE_JID,
        messageId: 'msg-sent-2',
        text: 'Resposta',
        createdByUserId: 'agent-1',
      })

      const updateData = mockActivityUpdate.mock.calls[0][0] as { data: { description: string } }
      expect(updateData.data.description).toContain('linha anterior')
      expect(updateData.data.description).toContain('Você')
      expect(updateData.data.description).toContain('Resposta')
    })

    it('should return the existing activityId', async () => {
      const result = await sut.recordSentMessage({
        customerId: 'cust-1',
        remoteJid: REMOTE_JID,
        messageId: 'msg-sent-2',
        text: 'Resposta',
        createdByUserId: 'agent-1',
      })

      expect(result).toEqual({ activityId: 'act-open' })
    })
  })
})

describe('WhatsAppWebhookService.process', () => {
  describe('early returns (no side effects)', () => {
    it('should return early for non-upsert events', async () => {
      await sut.process(makePayload({ event: 'connection.update' }))
      expect(mockWhatsAppMessageFindUnique).not.toHaveBeenCalled()
    })

    it('should return early when key.id is missing', async () => {
      await sut.process(makePayload({ key: { remoteJid: '5511@s.whatsapp.net' } }))
      expect(mockWhatsAppMessageFindUnique).not.toHaveBeenCalled()
    })

    it('should return early for group JIDs (@g.us)', async () => {
      await sut.process(makePayload({ key: { id: 'msg-grp', remoteJid: '12345@g.us', fromMe: false } }))
      expect(mockWhatsAppMessageFindUnique).not.toHaveBeenCalled()
    })

    it('should return early for duplicate messageId (idempotency)', async () => {
      mockWhatsAppMessageFindUnique.mockResolvedValueOnce({ id: 'existing' })
      await sut.process(makePayload())
      expect(mockPhoneMatcher.match).not.toHaveBeenCalled()
    })

    it('should return early when phone has no CRM match', async () => {
      mockWhatsAppMessageFindUnique.mockResolvedValueOnce(null)
      mockPhoneMatcher.match.mockResolvedValueOnce(null)
      await sut.process(makePayload())
      expect(mockActivityCreate).not.toHaveBeenCalled()
      expect(mockNotifications.pushBroadcast).not.toHaveBeenCalled()
    })
  })

  describe('new session (no open activity within 2h)', () => {
    beforeEach(() => {
      mockWhatsAppMessageFindUnique.mockResolvedValueOnce(null)
      mockPhoneMatcher.match.mockResolvedValueOnce({ customerId: 'cust-1', contactId: 'c-1' })
      mockActivityFindFirst.mockResolvedValueOnce(null)
      mockActivityCreate.mockResolvedValueOnce({ id: 'act-new' })
      mockWhatsAppMessageCreate.mockResolvedValueOnce({ id: 'wm-1' })
    })

    it('should create a new activity with type whatsapp', async () => {
      await sut.process(makePayload())
      expect(mockActivityCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'whatsapp', status: 'open', customerId: 'cust-1' }),
        }),
      )
    })

    it('should create a WhatsAppMessage record', async () => {
      await sut.process(makePayload())
      expect(mockWhatsAppMessageCreate).toHaveBeenCalledOnce()
      expect(mockWhatsAppMessageCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ messageId: 'msg-1', remoteJid: '5511999998888@s.whatsapp.net' }),
        }),
      )
    })

    it('should push broadcast notification for incoming message', async () => {
      await sut.process(makePayload())
      expect(mockNotifications.pushBroadcast).toHaveBeenCalledOnce()
      expect(mockNotifications.pushBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'activity.whatsapp',
          title: 'WhatsApp — João Silva',
        }),
      )
    })

    it('notification body should contain message text', async () => {
      await sut.process(makePayload())
      const call = mockNotifications.pushBroadcast.mock.calls[0][0] as { body: string }
      expect(call.body).toBe('Olá, tudo bem?')
    })

    it('notification meta should include customerId and remoteJid', async () => {
      await sut.process(makePayload())
      const call = mockNotifications.pushBroadcast.mock.calls[0][0] as { meta: Record<string, unknown> }
      expect(call.meta.customerId).toBe('cust-1')
      expect(call.meta.remoteJid).toBe('5511999998888@s.whatsapp.net')
    })
  })

  describe('fromMe messages', () => {
    it('should NOT push broadcast for messages sent by the operator (fromMe=true)', async () => {
      mockWhatsAppMessageFindUnique.mockResolvedValueOnce(null)
      mockPhoneMatcher.match.mockResolvedValueOnce({ customerId: 'cust-1' })
      mockActivityFindFirst.mockResolvedValueOnce({ id: 'act-existing', description: 'prev' })
      mockActivityUpdate.mockResolvedValueOnce({})
      mockWhatsAppMessageCreate.mockResolvedValueOnce({ id: 'wm-fromme' })

      await sut.process(makePayload({ key: { id: 'msg-out', remoteJid: '5511999998888@s.whatsapp.net', fromMe: true } }))

      expect(mockNotifications.pushBroadcast).not.toHaveBeenCalled()
    })
  })

  describe('existing session (open activity within 2h)', () => {
    beforeEach(() => {
      mockWhatsAppMessageFindUnique.mockResolvedValueOnce(null)
      mockPhoneMatcher.match.mockResolvedValueOnce({ customerId: 'cust-1' })
      mockActivityFindFirst.mockResolvedValueOnce({ id: 'act-open', description: 'linha anterior' })
      mockActivityUpdate.mockResolvedValueOnce({})
      mockWhatsAppMessageCreate.mockResolvedValueOnce({ id: 'wm-2' })
    })

    it('should NOT create a new activity (should update existing)', async () => {
      await sut.process(makePayload({ key: { id: 'msg-2', remoteJid: '5511999998888@s.whatsapp.net', fromMe: false } }))
      expect(mockActivityCreate).not.toHaveBeenCalled()
      expect(mockActivityUpdate).toHaveBeenCalledOnce()
    })

    it('should append new line to existing activity description', async () => {
      await sut.process(makePayload({ key: { id: 'msg-2', remoteJid: '5511999998888@s.whatsapp.net', fromMe: false } }))
      const updateData = mockActivityUpdate.mock.calls[0][0] as { data: { description: string } }
      expect(updateData.data.description).toContain('linha anterior')
    })

    it('should push broadcast for incoming message in existing session', async () => {
      await sut.process(makePayload({ key: { id: 'msg-3', remoteJid: '5511999998888@s.whatsapp.net', fromMe: false } }))
      expect(mockNotifications.pushBroadcast).toHaveBeenCalledOnce()
    })
  })

  describe('media messages', () => {
    it('should trigger media processing for audioMessage', async () => {
      mockWhatsAppMessageFindUnique.mockResolvedValueOnce(null)
      mockPhoneMatcher.match.mockResolvedValueOnce({ customerId: 'cust-1' })
      mockActivityFindFirst.mockResolvedValueOnce(null)
      mockActivityCreate.mockResolvedValueOnce({ id: 'act-audio' })
      mockWhatsAppMessageCreate.mockResolvedValueOnce({ id: 'wm-audio' })

      await sut.process(makePayload({
        key: { id: 'msg-audio', remoteJid: '5511999998888@s.whatsapp.net', fromMe: false },
        messageType: 'audioMessage',
        message: { audioMessage: { seconds: 30, mimetype: 'audio/ogg' } },
      }))

      expect(mockMediaService.process).toHaveBeenCalledOnce()
    })

    it('should NOT trigger media processing for text message', async () => {
      mockWhatsAppMessageFindUnique.mockResolvedValueOnce(null)
      mockPhoneMatcher.match.mockResolvedValueOnce({ customerId: 'cust-1' })
      mockActivityFindFirst.mockResolvedValueOnce(null)
      mockActivityCreate.mockResolvedValueOnce({ id: 'act-text' })
      mockWhatsAppMessageCreate.mockResolvedValueOnce({ id: 'wm-text' })

      await sut.process(makePayload())

      expect(mockMediaService.process).not.toHaveBeenCalled()
    })
  })
})
