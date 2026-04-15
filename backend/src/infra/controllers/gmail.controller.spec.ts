import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { GmailController } from './gmail.controller'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockConfig = {
  get: vi.fn((key: string) => {
    const map: Record<string, string> = {
      INTERNAL_API_KEY: 'test-api-key',
    }
    return map[key]
  }),
}

const mockGmailService = {
  sendEmail: vi.fn(),
}

const mockPollerService = {
  poll: vi.fn(),
}

const mockPrisma = {
  activity: {
    create: vi.fn(),
    updateMany: vi.fn(),
  },
}

const fakeUser = { userId: 'user-1' }

function makeController() {
  return new GmailController(
    mockConfig as never,
    mockPollerService as never,
    mockGmailService as never,
    mockPrisma as never,
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GmailController.sendEmail', () => {
  let ctrl: GmailController

  beforeEach(() => {
    vi.clearAllMocks()
    ctrl = makeController()
    mockGmailService.sendEmail.mockResolvedValue({ messageId: 'msg-sent', threadId: 'thread-sent' })
    mockPrisma.activity.create.mockResolvedValue({ id: 'act-1' })
    mockPrisma.activity.updateMany.mockResolvedValue({ count: 1 })
  })

  it('should throw BadRequestException when to is empty', async () => {
    await expect(
      ctrl.sendEmail('cust-1', { to: [], subject: 'S', htmlBody: '<p>h</p>' }, fakeUser),
    ).rejects.toThrow(BadRequestException)
    expect(mockGmailService.sendEmail).not.toHaveBeenCalled()
  })

  it('should call gmailService.sendEmail with correct fields', async () => {
    await ctrl.sendEmail(
      'cust-1',
      { to: ['a@b.com'], cc: ['c@d.com'], subject: 'Proposta', htmlBody: '<p>Hi</p>' },
      fakeUser,
    )
    expect(mockGmailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['a@b.com'],
        cc: ['c@d.com'],
        subject: 'Proposta',
        htmlBody: '<p>Hi</p>',
      }),
    )
  })

  it('should create an Activity after sending', async () => {
    await ctrl.sendEmail(
      'cust-1',
      { to: ['a@b.com'], subject: 'Assunto', htmlBody: '<p>corpo</p>' },
      fakeUser,
    )
    expect(mockPrisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: 'cust-1',
          type: 'email',
          status: 'done',
          emailMessageId: 'msg-sent',
          emailThreadId: 'thread-sent',
          createdByUserId: 'user-1',
        }),
      }),
    )
  })

  it('should mark thread as replied when threadId is provided', async () => {
    await ctrl.sendEmail(
      'cust-1',
      { to: ['a@b.com'], subject: 'Re: S', htmlBody: '<p>ok</p>', threadId: 'thread-orig' },
      fakeUser,
    )
    expect(mockPrisma.activity.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ emailThreadId: 'thread-orig', emailReplied: false }),
        data: { emailReplied: true },
      }),
    )
  })

  it('should NOT call updateMany when there is no threadId', async () => {
    await ctrl.sendEmail(
      'cust-1',
      { to: ['a@b.com'], subject: 'S', htmlBody: '<p>h</p>' },
      fakeUser,
    )
    expect(mockPrisma.activity.updateMany).not.toHaveBeenCalled()
  })

  it('should return ok, messageId and threadId', async () => {
    const result = await ctrl.sendEmail(
      'cust-1',
      { to: ['a@b.com'], subject: 'S', htmlBody: '<p>h</p>' },
      fakeUser,
    )
    expect(result).toEqual({ ok: true, messageId: 'msg-sent', threadId: 'thread-sent' })
  })

  describe('attachment handling (base64 → Buffer conversion)', () => {
    it('should convert base64 attachment to Buffer before calling gmailService', async () => {
      const originalContent = 'Hello, this is a PDF!'
      const base64 = Buffer.from(originalContent).toString('base64')

      await ctrl.sendEmail(
        'cust-1',
        {
          to: ['a@b.com'],
          subject: 'Com Anexo',
          htmlBody: '<p>Segue</p>',
          attachments: [{ fileName: 'doc.pdf', mimeType: 'application/pdf', base64 }],
        },
        fakeUser,
      )

      const callArg = mockGmailService.sendEmail.mock.calls[0][0] as {
        attachments: Array<{ fileName: string; mimeType: string; buffer: Buffer }>
      }
      expect(callArg.attachments).toHaveLength(1)
      expect(callArg.attachments[0].fileName).toBe('doc.pdf')
      expect(callArg.attachments[0].mimeType).toBe('application/pdf')
      expect(Buffer.isBuffer(callArg.attachments[0].buffer)).toBe(true)
      expect(callArg.attachments[0].buffer.toString('utf-8')).toBe(originalContent)
    })

    it('should convert multiple attachments', async () => {
      const b64a = Buffer.from('file-a').toString('base64')
      const b64b = Buffer.from('file-b').toString('base64')

      await ctrl.sendEmail(
        'cust-1',
        {
          to: ['a@b.com'],
          subject: 'Multi',
          htmlBody: '<p>multi</p>',
          attachments: [
            { fileName: 'a.pdf', mimeType: 'application/pdf', base64: b64a },
            { fileName: 'b.png', mimeType: 'image/png', base64: b64b },
          ],
        },
        fakeUser,
      )

      const callArg = mockGmailService.sendEmail.mock.calls[0][0] as {
        attachments: Array<{ buffer: Buffer }>
      }
      expect(callArg.attachments).toHaveLength(2)
      expect(callArg.attachments[0].buffer.toString()).toBe('file-a')
      expect(callArg.attachments[1].buffer.toString()).toBe('file-b')
    })

    it('should pass undefined attachments when no attachments provided', async () => {
      await ctrl.sendEmail(
        'cust-1',
        { to: ['a@b.com'], subject: 'S', htmlBody: '<p>h</p>' },
        fakeUser,
      )
      const callArg = mockGmailService.sendEmail.mock.calls[0][0] as { attachments: unknown }
      expect(callArg.attachments).toBeUndefined()
    })

    it('should pass undefined when attachments array is empty', async () => {
      await ctrl.sendEmail(
        'cust-1',
        { to: ['a@b.com'], subject: 'S', htmlBody: '<p>h</p>', attachments: [] },
        fakeUser,
      )
      const callArg = mockGmailService.sendEmail.mock.calls[0][0] as { attachments: unknown }
      expect(callArg.attachments).toBeUndefined()
    })
  })
})

describe('GmailController.gmailPoll', () => {
  let ctrl: GmailController

  beforeEach(() => {
    vi.clearAllMocks()
    ctrl = makeController()
    mockPollerService.poll.mockResolvedValue(undefined)
  })

  it('should return 401 when api key is wrong', async () => {
    const { UnauthorizedException } = await import('@nestjs/common')
    await expect(ctrl.gmailPoll('wrong-key')).rejects.toThrow(UnauthorizedException)
  })

  it('should return ok:true with correct api key', async () => {
    const result = await ctrl.gmailPoll('test-api-key')
    expect(result).toEqual({ ok: true })
  })

  it('should call pollerService.poll (fire-and-forget)', async () => {
    await ctrl.gmailPoll('test-api-key')
    // poll is async/background — give a tick
    await new Promise((r) => setTimeout(r, 10))
    expect(mockPollerService.poll).toHaveBeenCalledOnce()
  })
})
