import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GoToWebhookService } from './goto-webhook.service'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = {
  activity: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}

const mockApiClient = {
  getCallReport: vi.fn(),
}

const mockPhoneMatcher = {
  match: vi.fn(),
  normalize: vi.fn((p: string) => p),
}

const mockNotifications = {
  pushBroadcast: vi.fn(),
}

function makeReport(overrides: Partial<{
  direction: string
  caller: string
  callee: string
  callOutcome: string
  durationSeconds: number
  startTime: string
}> = {}) {
  return {
    direction: overrides.direction ?? 'inbound',
    caller: overrides.caller ?? '+5511999998888',
    callee: overrides.callee ?? '+551130001111',
    callOutcome: overrides.callOutcome ?? 'answered',
    durationSeconds: overrides.durationSeconds ?? 120,
    startTime: overrides.startTime ?? new Date().toISOString(),
  }
}

let sut: GoToWebhookService

beforeEach(() => {
  vi.clearAllMocks()
  sut = new GoToWebhookService(
    mockPrisma as never,
    mockApiClient as never,
    mockPhoneMatcher as never,
    mockNotifications as never,
  )
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GoToWebhookService.process', () => {
  describe('early returns (no side effects)', () => {
    it('should return early when no conversationSpaceId', async () => {
      await sut.process({})
      expect(mockPrisma.activity.findFirst).not.toHaveBeenCalled()
    })

    it('should return early when activity already exists (idempotency)', async () => {
      mockPrisma.activity.findFirst.mockResolvedValueOnce({ id: 'existing' })
      await sut.process({ conversationSpaceId: 'cs-dupe' })
      expect(mockApiClient.getCallReport).not.toHaveBeenCalled()
      expect(mockNotifications.pushBroadcast).not.toHaveBeenCalled()
    })

    it('should return early when call report is null', async () => {
      mockPrisma.activity.findFirst.mockResolvedValueOnce(null)
      mockApiClient.getCallReport.mockResolvedValueOnce(null)
      await sut.process({ conversationSpaceId: 'cs-no-report' })
      expect(mockPhoneMatcher.match).not.toHaveBeenCalled()
      expect(mockNotifications.pushBroadcast).not.toHaveBeenCalled()
    })

    it('should return early when no external phone on report', async () => {
      mockPrisma.activity.findFirst.mockResolvedValueOnce(null)
      mockApiClient.getCallReport.mockResolvedValueOnce({ direction: 'inbound', caller: null })
      await sut.process({ conversationSpaceId: 'cs-no-phone' })
      expect(mockPhoneMatcher.match).not.toHaveBeenCalled()
    })

    it('should return early when phone has no CRM match', async () => {
      mockPrisma.activity.findFirst.mockResolvedValueOnce(null)
      mockApiClient.getCallReport.mockResolvedValueOnce(makeReport())
      mockPhoneMatcher.match.mockResolvedValueOnce(null)
      await sut.process({ conversationSpaceId: 'cs-no-match' })
      expect(mockPrisma.activity.create).not.toHaveBeenCalled()
      expect(mockNotifications.pushBroadcast).not.toHaveBeenCalled()
    })
  })

  describe('successful processing', () => {
    async function processSuccessfulCall(conversationSpaceId = 'cs-ok') {
      mockPrisma.activity.findFirst.mockResolvedValueOnce(null)
      mockApiClient.getCallReport.mockResolvedValueOnce(makeReport())
      mockPhoneMatcher.match.mockResolvedValueOnce({ customerId: 'cust-1', contactId: 'c-1' })
      mockPhoneMatcher.normalize.mockReturnValue('+5511999998888')
      mockPrisma.activity.create.mockResolvedValueOnce({ id: 'act-new' })
      await sut.process({ conversationSpaceId })
    }

    it('should create activity with correct type and status', async () => {
      await processSuccessfulCall()
      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'phone_call',
            status: 'done',
            gotoCallId: 'cs-ok',
            gotoCallOutcome: 'answered',
          }),
        }),
      )
    })

    it('should push broadcast notification after activity creation', async () => {
      await processSuccessfulCall()
      expect(mockNotifications.pushBroadcast).toHaveBeenCalledOnce()
      expect(mockNotifications.pushBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'activity.phone_call',
          meta: expect.objectContaining({ customerId: 'cust-1' }),
        }),
      )
    })

    it('should use caller as phone for inbound calls', async () => {
      mockPrisma.activity.findFirst.mockResolvedValueOnce(null)
      mockApiClient.getCallReport.mockResolvedValueOnce(makeReport({ direction: 'inbound', caller: '+5511977776666' }))
      mockPhoneMatcher.match.mockResolvedValueOnce({ customerId: 'cust-2' })
      mockPhoneMatcher.normalize.mockReturnValue('+5511977776666')
      mockPrisma.activity.create.mockResolvedValueOnce({ id: 'act-2' })

      await sut.process({ conversationSpaceId: 'cs-inbound' })

      expect(mockPhoneMatcher.match).toHaveBeenCalledWith('+5511977776666')
    })

    it('should use callee as phone for outbound calls', async () => {
      mockPrisma.activity.findFirst.mockResolvedValueOnce(null)
      mockApiClient.getCallReport.mockResolvedValueOnce(makeReport({ direction: 'outbound', callee: '+5511955554444' }))
      mockPhoneMatcher.match.mockResolvedValueOnce({ customerId: 'cust-3' })
      mockPhoneMatcher.normalize.mockReturnValue('+5511955554444')
      mockPrisma.activity.create.mockResolvedValueOnce({ id: 'act-3' })

      await sut.process({ conversationSpaceId: 'cs-outbound' })

      expect(mockPhoneMatcher.match).toHaveBeenCalledWith('+5511955554444')
    })

    it('should also accept dialogId as fallback for conversationSpaceId', async () => {
      mockPrisma.activity.findFirst.mockResolvedValueOnce(null)
      mockApiClient.getCallReport.mockResolvedValueOnce(makeReport())
      mockPhoneMatcher.match.mockResolvedValueOnce({ customerId: 'cust-4' })
      mockPhoneMatcher.normalize.mockReturnValue('+5511988887777')
      mockPrisma.activity.create.mockResolvedValueOnce({ id: 'act-4' })

      await sut.process({ dialogId: 'dlg-1' })

      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ gotoCallId: 'dlg-1' }),
        }),
      )
    })
  })
})
