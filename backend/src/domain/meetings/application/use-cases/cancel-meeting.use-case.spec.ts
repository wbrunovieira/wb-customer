import { describe, it, expect, beforeEach } from 'vitest'
import { CancelMeetingUseCase } from './cancel-meeting.use-case'
import { InMemoryMeetingRepository } from '@/test/repositories/meetings/in-memory-meeting.repository'
import { MockCalendarAdapter } from '@/test/repositories/meetings/mock-calendar.adapter'
import { Meeting } from '@/domain/meetings/enterprise/entities/meeting'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { MeetingNotFoundError } from '../../domain/exceptions/meeting-not-found.error'
import { MeetingAlreadyCancelledError } from '../../domain/exceptions/meeting-already-cancelled.error'

let meetingRepo: InMemoryMeetingRepository
let calendarAdapter: MockCalendarAdapter
let sut: CancelMeetingUseCase

const customerId = 'customer-1'
const userId = 'user-1'

function makeMeeting(overrides?: Partial<{ googleEventId: string | null }>) {
  return Meeting.create(
    {
      customerId,
      title: 'Test Meeting',
      startAt: new Date(),
      endAt: new Date(),
      attendees: [],
      scheduledByUserId: userId,
      googleEventId: overrides?.googleEventId ?? null,
    },
    new UniqueEntityID('meeting-1'),
  )
}

beforeEach(() => {
  meetingRepo = new InMemoryMeetingRepository()
  calendarAdapter = new MockCalendarAdapter()
  sut = new CancelMeetingUseCase(meetingRepo, calendarAdapter)
})

describe('CancelMeetingUseCase', () => {
  it('should cancel a meeting successfully', async () => {
    meetingRepo.items.push(makeMeeting())

    const result = await sut.execute({ customerId, meetingId: 'meeting-1' })

    expect(result.isRight()).toBe(true)
    expect(meetingRepo.items[0].status.isCancelled()).toBe(true)
  })

  it('should cancel the Google Calendar event when googleEventId exists', async () => {
    meetingRepo.items.push(makeMeeting({ googleEventId: 'evt-123' }))

    await sut.execute({ customerId, meetingId: 'meeting-1' })

    expect(calendarAdapter.cancelledEventIds).toContain('evt-123')
  })

  it('should still cancel even if Google Calendar call fails', async () => {
    calendarAdapter.cancelEvent = async () => { throw new Error('calendar down') }
    meetingRepo.items.push(makeMeeting({ googleEventId: 'evt-123' }))

    const result = await sut.execute({ customerId, meetingId: 'meeting-1' })

    expect(result.isRight()).toBe(true)
    expect(meetingRepo.items[0].status.isCancelled()).toBe(true)
  })

  it('should return MeetingNotFoundError for unknown meeting', async () => {
    const result = await sut.execute({ customerId, meetingId: 'unknown' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(MeetingNotFoundError)
    }
  })

  it('should return MeetingNotFoundError when customerId does not match', async () => {
    meetingRepo.items.push(makeMeeting())

    const result = await sut.execute({ customerId: 'other-customer', meetingId: 'meeting-1' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(MeetingNotFoundError)
    }
  })

  it('should return MeetingAlreadyCancelledError if already cancelled', async () => {
    const meeting = makeMeeting()
    meeting.cancel()
    meetingRepo.items.push(meeting)

    const result = await sut.execute({ customerId, meetingId: 'meeting-1' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(MeetingAlreadyCancelledError)
    }
  })
})
