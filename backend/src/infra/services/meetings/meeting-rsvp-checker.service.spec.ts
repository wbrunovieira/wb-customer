import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MeetingRsvpCheckerService } from './meeting-rsvp-checker.service'
import { InMemoryMeetingRepository } from '@/test/repositories/meetings/in-memory-meeting.repository'
import { MockCalendarAdapter } from '@/test/repositories/meetings/mock-calendar.adapter'
import { Meeting } from '@/domain/meetings/enterprise/entities/meeting'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { MeetingStatus } from '@/domain/meetings/enterprise/value-objects/meeting-status.vo'

function makeMeeting(overrides: {
  startAt?: Date
  endAt?: Date
  status?: string
  googleEventId?: string
} = {}): Meeting {
  const now = new Date()
  return Meeting.restore(
    {
      customerId: 'customer-1',
      contactId: null,
      meetingTypeId: null,
      title: 'Test Meeting',
      description: null,
      startAt: overrides.startAt ?? new Date(now.getTime() + 24 * 60 * 60 * 1000),
      endAt: overrides.endAt ?? new Date(now.getTime() + 25 * 60 * 60 * 1000),
      actualStartAt: null,
      actualEndAt: null,
      googleEventId: overrides.googleEventId ?? 'google-event-123',
      meetLink: null,
      attendees: [{ email: 'client@test.com', responseStatus: 'needsAction' }],
      status: MeetingStatus.createUnsafe(overrides.status ?? 'scheduled'),
      scheduledByUserId: 'user-1',
      recordingDriveId: null,
      recordingUrl: null,
      recordingMovedAt: null,
      transcriptionJobId: null,
      transcriptText: null,
      transcribedAt: null,
      nativeTranscriptUrl: null,
      meetingSummary: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    new UniqueEntityID(),
  )
}

let meetingRepo: InMemoryMeetingRepository
let calendarAdapter: MockCalendarAdapter
let sut: MeetingRsvpCheckerService

beforeEach(() => {
  meetingRepo = new InMemoryMeetingRepository()
  calendarAdapter = new MockCalendarAdapter()
  sut = new MeetingRsvpCheckerService(meetingRepo, calendarAdapter)
})

describe('MeetingRsvpCheckerService', () => {
  it('should update attendee responseStatus when Google Calendar returns accepted', async () => {
    const meeting = makeMeeting({ googleEventId: 'event-abc' })
    meetingRepo.items.push(meeting)

    vi.spyOn(calendarAdapter, 'getEvent').mockResolvedValueOnce({
      googleEventId: 'event-abc',
      meetLink: null,
      attendees: [{ email: 'client@test.com', responseStatus: 'accepted' }],
    })

    await sut.checkRsvpStatuses()

    const saved = meetingRepo.items[0]
    expect(saved.attendees[0].responseStatus).toBe('accepted')
  })

  it('should sync meetings scheduled up to 30 days ahead, not just 1 hour', async () => {
    const farMeeting = makeMeeting({
      googleEventId: 'event-far',
      startAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days ahead
      endAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
    })
    meetingRepo.items.push(farMeeting)

    vi.spyOn(calendarAdapter, 'getEvent').mockResolvedValueOnce({
      googleEventId: 'event-far',
      meetLink: null,
      attendees: [{ email: 'client@test.com', responseStatus: 'accepted' }],
    })

    await sut.checkRsvpStatuses()

    expect(meetingRepo.items[0].attendees[0].responseStatus).toBe('accepted')
  })

  it('should NOT sync meetings scheduled more than 30 days ahead', async () => {
    const distantMeeting = makeMeeting({
      googleEventId: 'event-distant',
      startAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days ahead
      endAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
    })
    meetingRepo.items.push(distantMeeting)

    const getEventSpy = vi.spyOn(calendarAdapter, 'getEvent')

    await sut.checkRsvpStatuses()

    expect(getEventSpy).not.toHaveBeenCalled()
  })

  it('should skip meetings without a googleEventId', async () => {
    const meeting = makeMeeting({ googleEventId: '' })
    // force null googleEventId
    Object.defineProperty(meeting, 'googleEventId', { get: () => null })
    meetingRepo.items.push(meeting)

    const getEventSpy = vi.spyOn(calendarAdapter, 'getEvent')

    await sut.checkRsvpStatuses()

    expect(getEventSpy).not.toHaveBeenCalled()
  })

  it('should skip cancelled and ended meetings', async () => {
    const cancelled = makeMeeting({ status: 'cancelled' })
    const ended = makeMeeting({ status: 'ended' })
    meetingRepo.items.push(cancelled, ended)

    const getEventSpy = vi.spyOn(calendarAdapter, 'getEvent')

    await sut.checkRsvpStatuses()

    expect(getEventSpy).not.toHaveBeenCalled()
  })

  it('should continue processing other meetings if one fails', async () => {
    const meeting1 = makeMeeting({ googleEventId: 'event-1' })
    const meeting2 = makeMeeting({ googleEventId: 'event-2' })
    meetingRepo.items.push(meeting1, meeting2)

    vi.spyOn(calendarAdapter, 'getEvent')
      .mockRejectedValueOnce(new Error('Google API error'))
      .mockResolvedValueOnce({
        googleEventId: 'event-2',
        meetLink: null,
        attendees: [{ email: 'client@test.com', responseStatus: 'accepted' }],
      })

    await expect(sut.checkRsvpStatuses()).resolves.not.toThrow()

    const saved2 = meetingRepo.items.find((m) => m.googleEventId === 'event-2')
    expect(saved2?.attendees[0].responseStatus).toBe('accepted')
  })

  it('should not save if calendar returns no attendees', async () => {
    const meeting = makeMeeting({ googleEventId: 'event-empty' })
    meetingRepo.items.push(meeting)

    vi.spyOn(calendarAdapter, 'getEvent').mockResolvedValueOnce({
      googleEventId: 'event-empty',
      meetLink: null,
      attendees: [],
    })

    const saveSpy = vi.spyOn(meetingRepo, 'save')

    await sut.checkRsvpStatuses()

    expect(saveSpy).not.toHaveBeenCalled()
  })
})
