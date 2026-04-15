import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GmailPollerService } from './gmail-poller.service'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGoogleTokenFindFirst = vi.fn()
const mockGoogleTokenUpdate = vi.fn()
const mockActivityFindFirst = vi.fn()
const mockActivityCreate = vi.fn()
const mockContactFindFirst = vi.fn()
const mockCustomerFindFirst = vi.fn()

const mockPrisma = {
  googleToken: {
    findFirst: mockGoogleTokenFindFirst,
    update: mockGoogleTokenUpdate,
  },
  activity: {
    findFirst: mockActivityFindFirst,
    create: mockActivityCreate,
  },
  contact: { findFirst: mockContactFindFirst },
  customer: { findFirst: mockCustomerFindFirst },
}

const mockGmailService = {
  pollInbox: vi.fn(),
}

const mockPhoneMatcher = {}

const mockNotifications = {
  pushBroadcast: vi.fn(),
}

function makeGoogleToken(overrides: Partial<{ gmailHistoryId: string }> = {}) {
  return {
    id: 'token-1',
    gmailHistoryId: overrides.gmailHistoryId ?? null,
    accessToken: 'at',
    refreshToken: 'rt',
    expiresAt: new Date(Date.now() + 3600 * 1000),
  }
}

function makeMessage(overrides: Partial<{
  messageId: string
  fromAddress: string
  fromName: string
  subject: string
  bodyText: string
}> = {}) {
  return {
    messageId: overrides.messageId ?? 'gmail-msg-1',
    threadId: 'thread-1',
    fromAddress: overrides.fromAddress ?? 'cliente@empresa.com',
    fromName: overrides.fromName ?? 'Carlos Silva',
    subject: overrides.subject ?? 'Proposta comercial',
    bodyText: overrides.bodyText ?? 'Olá, segue proposta.',
    receivedAt: new Date(),
  }
}

let sut: GmailPollerService

beforeEach(() => {
  vi.clearAllMocks()
  sut = new GmailPollerService(
    mockPrisma as never,
    mockGmailService as never,
    mockPhoneMatcher as never,
    mockNotifications as never,
  )
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GmailPollerService.poll', () => {
  it('should return early when no Google token exists', async () => {
    mockGoogleTokenFindFirst.mockResolvedValueOnce(null)
    await sut.poll()
    expect(mockGmailService.pollInbox).not.toHaveBeenCalled()
  })

  it('should call pollInbox with null historyId on first poll', async () => {
    mockGoogleTokenFindFirst.mockResolvedValueOnce(makeGoogleToken({ gmailHistoryId: undefined }))
    mockGmailService.pollInbox.mockResolvedValueOnce({ messages: [], nextHistoryId: '12345' })
    await sut.poll()
    expect(mockGmailService.pollInbox).toHaveBeenCalledWith(null)
  })

  it('should call pollInbox with stored historyId on subsequent polls', async () => {
    mockGoogleTokenFindFirst.mockResolvedValueOnce(makeGoogleToken({ gmailHistoryId: '99999' }))
    mockGmailService.pollInbox.mockResolvedValueOnce({ messages: [], nextHistoryId: '100000' })
    await sut.poll()
    expect(mockGmailService.pollInbox).toHaveBeenCalledWith('99999')
  })

  it('should update gmailHistoryId when nextHistoryId is returned', async () => {
    mockGoogleTokenFindFirst.mockResolvedValueOnce(makeGoogleToken())
    mockGmailService.pollInbox.mockResolvedValueOnce({ messages: [], nextHistoryId: '55555' })
    await sut.poll()
    expect(mockGoogleTokenUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ gmailHistoryId: '55555' }) }),
    )
  })

  it('should NOT update historyId when nextHistoryId is unchanged', async () => {
    mockGoogleTokenFindFirst.mockResolvedValueOnce(makeGoogleToken({ gmailHistoryId: '44444' }))
    mockGmailService.pollInbox.mockResolvedValueOnce({ messages: [], nextHistoryId: '44444' })
    await sut.poll()
    expect(mockGoogleTokenUpdate).not.toHaveBeenCalled()
  })
})

describe('GmailPollerService — processIncoming', () => {
  async function pollWithMessage(msg: ReturnType<typeof makeMessage>, matchResult: { customerId: string; contactId?: string } | null) {
    mockGoogleTokenFindFirst.mockResolvedValueOnce(makeGoogleToken())
    mockGmailService.pollInbox.mockResolvedValueOnce({ messages: [msg], nextHistoryId: '200' })
    mockActivityFindFirst.mockResolvedValueOnce(null) // not duplicate
    if (matchResult) {
      mockContactFindFirst.mockResolvedValueOnce(matchResult.contactId
        ? { id: matchResult.contactId, customerId: matchResult.customerId }
        : null,
      )
      if (!matchResult.contactId) {
        mockCustomerFindFirst.mockResolvedValueOnce({ id: matchResult.customerId })
      }
    } else {
      mockContactFindFirst.mockResolvedValueOnce(null)
      mockCustomerFindFirst.mockResolvedValueOnce(null)
    }
    mockActivityCreate.mockResolvedValueOnce({ id: 'act-email' })
    mockGoogleTokenUpdate.mockResolvedValueOnce({})
    await sut.poll()
  }

  it('should skip duplicate emails (idempotency)', async () => {
    mockGoogleTokenFindFirst.mockResolvedValueOnce(makeGoogleToken())
    mockGmailService.pollInbox.mockResolvedValueOnce({ messages: [makeMessage()], nextHistoryId: '300' })
    mockActivityFindFirst.mockResolvedValueOnce({ id: 'existing-act' }) // already exists
    mockGoogleTokenUpdate.mockResolvedValueOnce({})
    await sut.poll()
    expect(mockActivityCreate).not.toHaveBeenCalled()
    expect(mockNotifications.pushBroadcast).not.toHaveBeenCalled()
  })

  it('should skip emails with no CRM match', async () => {
    await pollWithMessage(makeMessage(), null)
    expect(mockActivityCreate).not.toHaveBeenCalled()
    expect(mockNotifications.pushBroadcast).not.toHaveBeenCalled()
  })

  it('should create activity when email matches a contact', async () => {
    const msg = makeMessage({ fromAddress: 'carlos@empresa.com', fromName: 'Carlos' })
    await pollWithMessage(msg, { customerId: 'cust-1', contactId: 'contact-1' })
    expect(mockActivityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'email',
          status: 'open',
          emailFromAddress: 'carlos@empresa.com',
          customerId: 'cust-1',
          contactId: 'contact-1',
        }),
      }),
    )
  })

  it('should create activity when email matches a customer (no contact)', async () => {
    const msg = makeMessage({ fromAddress: 'owner@empresa.com' })
    await pollWithMessage(msg, { customerId: 'cust-2' })
    expect(mockActivityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customerId: 'cust-2', contactId: null }),
      }),
    )
  })

  it('should push broadcast notification after creating email activity', async () => {
    const msg = makeMessage({ fromName: 'Maria', subject: 'Urgente: contrato' })
    await pollWithMessage(msg, { customerId: 'cust-3' })
    expect(mockNotifications.pushBroadcast).toHaveBeenCalledOnce()
    expect(mockNotifications.pushBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity.email',
        title: 'E-mail — Maria',
        body: 'Urgente: contrato',
        meta: expect.objectContaining({ customerId: 'cust-3' }),
      }),
    )
  })

  it('should process multiple emails in one poll cycle', async () => {
    const msg1 = makeMessage({ messageId: 'msg-A', fromAddress: 'a@a.com', fromName: 'A' })
    const msg2 = makeMessage({ messageId: 'msg-B', fromAddress: 'b@b.com', fromName: 'B' })

    mockGoogleTokenFindFirst.mockResolvedValueOnce(makeGoogleToken())
    mockGmailService.pollInbox.mockResolvedValueOnce({ messages: [msg1, msg2], nextHistoryId: '400' })

    // msg1 — no match
    mockActivityFindFirst.mockResolvedValueOnce(null)
    mockContactFindFirst.mockResolvedValueOnce(null)
    mockCustomerFindFirst.mockResolvedValueOnce(null)

    // msg2 — matches customer
    mockActivityFindFirst.mockResolvedValueOnce(null)
    mockContactFindFirst.mockResolvedValueOnce(null)
    mockCustomerFindFirst.mockResolvedValueOnce({ id: 'cust-4' })
    mockActivityCreate.mockResolvedValueOnce({ id: 'act-B' })

    mockGoogleTokenUpdate.mockResolvedValueOnce({})

    await sut.poll()

    expect(mockActivityCreate).toHaveBeenCalledOnce()
    expect(mockNotifications.pushBroadcast).toHaveBeenCalledOnce()
  })
})
