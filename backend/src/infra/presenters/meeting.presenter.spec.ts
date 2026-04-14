import { describe, it, expect } from 'vitest'
import { MeetingPresenter } from './meeting.presenter'
import { Meeting } from '@/domain/meetings/enterprise/entities/meeting'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { MeetingStatus } from '@/domain/meetings/enterprise/value-objects/meeting-status.vo'

function makeMeeting(overrides: Partial<Parameters<typeof Meeting.restore>[0]> = {}) {
  return Meeting.restore(
    {
      customerId: 'customer-1',
      contactId: null,
      meetingTypeId: 'type-1',
      title: 'Kickoff',
      description: 'Initial meeting',
      startAt: new Date('2026-04-14T18:00:00.000Z'),
      endAt: new Date('2026-04-14T19:00:00.000Z'),
      actualStartAt: null,
      actualEndAt: null,
      googleEventId: 'google-event-id',
      meetLink: 'https://meet.google.com/abc-def',
      attendees: [
        { email: 'client@test.com', responseStatus: 'needsAction' },
        { email: 'manager@agency.com', responseStatus: 'accepted' },
      ],
      status: MeetingStatus.createUnsafe('scheduled'),
      scheduledByUserId: 'user-1',
      recordingDriveId: null,
      recordingUrl: null,
      recordingMovedAt: null,
      transcriptionJobId: null,
      transcriptText: null,
      transcribedAt: null,
      nativeTranscriptUrl: null,
      meetingSummary: 'Great meeting',
      createdAt: new Date('2026-04-14T10:00:00.000Z'),
      updatedAt: new Date('2026-04-14T10:00:00.000Z'),
      ...overrides,
    },
    new UniqueEntityID('meeting-id-1'),
  )
}

describe('MeetingPresenter', () => {
  it('should return a flat plain object (no domain entity nesting)', () => {
    const meeting = makeMeeting()
    const result = MeetingPresenter.toHTTP(meeting)

    expect(result).not.toHaveProperty('props')
    expect(result).not.toHaveProperty('_id')
    expect(result).not.toHaveProperty('domainEvents')
  })

  it('should map id as plain string', () => {
    const meeting = makeMeeting()
    const result = MeetingPresenter.toHTTP(meeting)
    expect(result.id).toBe('meeting-id-1')
  })

  it('should serialize startAt as ISO string', () => {
    const meeting = makeMeeting()
    const result = MeetingPresenter.toHTTP(meeting)

    expect(typeof result.startAt).toBe('string')
    expect(result.startAt).toBe('2026-04-14T18:00:00.000Z')
    expect(new Date(result.startAt).getTime()).not.toBeNaN()
  })

  it('should serialize endAt as ISO string', () => {
    const meeting = makeMeeting()
    const result = MeetingPresenter.toHTTP(meeting)

    expect(typeof result.endAt).toBe('string')
    expect(result.endAt).toBe('2026-04-14T19:00:00.000Z')
    expect(new Date(result.endAt!).getTime()).not.toBeNaN()
  })

  it('should serialize null endAt as null', () => {
    const meeting = makeMeeting({ endAt: null })
    const result = MeetingPresenter.toHTTP(meeting)
    expect(result.endAt).toBeNull()
  })

  it('should serialize status as plain string value', () => {
    const meeting = makeMeeting()
    const result = MeetingPresenter.toHTTP(meeting)

    expect(typeof result.status).toBe('string')
    expect(result.status).toBe('scheduled')
  })

  it('should include attendees array', () => {
    const meeting = makeMeeting()
    const result = MeetingPresenter.toHTTP(meeting)

    expect(Array.isArray(result.attendees)).toBe(true)
    expect(result.attendees).toHaveLength(2)
    expect(result.attendees[0]).toEqual({ email: 'client@test.com', responseStatus: 'needsAction' })
  })

  it('should include meetLink, meetingSummary, googleEventId', () => {
    const meeting = makeMeeting()
    const result = MeetingPresenter.toHTTP(meeting)

    expect(result.meetLink).toBe('https://meet.google.com/abc-def')
    expect(result.meetingSummary).toBe('Great meeting')
    expect(result.googleEventId).toBe('google-event-id')
  })

  it('should serialize createdAt and updatedAt as ISO strings', () => {
    const meeting = makeMeeting()
    const result = MeetingPresenter.toHTTP(meeting)

    expect(typeof result.createdAt).toBe('string')
    expect(typeof result.updatedAt).toBe('string')
    expect(new Date(result.createdAt).getTime()).not.toBeNaN()
  })

  it('should include all scalar fields', () => {
    const meeting = makeMeeting()
    const result = MeetingPresenter.toHTTP(meeting)

    expect(result.customerId).toBe('customer-1')
    expect(result.meetingTypeId).toBe('type-1')
    expect(result.title).toBe('Kickoff')
    expect(result.description).toBe('Initial meeting')
    expect(result.scheduledByUserId).toBe('user-1')
  })
})
