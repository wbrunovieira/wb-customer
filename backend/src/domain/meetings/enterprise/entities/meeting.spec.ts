import { describe, it, expect } from 'vitest'
import { Meeting } from './meeting'
import { MeetingScheduledEvent } from '../events/meeting-scheduled.event'
import { MeetingCompletedEvent } from '../events/meeting-completed.event'

function makeMeeting() {
  return Meeting.create({
    customerId: 'customer-1',
    title: 'Planning Session',
    startAt: new Date('2026-05-01T10:00:00Z'),
    endAt: new Date('2026-05-01T11:00:00Z'),
    attendees: [{ email: 'a@test.com', responseStatus: 'needsAction' }],
    scheduledByUserId: 'user-1',
  })
}

describe('Meeting entity', () => {
  it('should create with scheduled status', () => {
    const meeting = makeMeeting()
    expect(meeting.status.isScheduled()).toBe(true)
    expect(meeting.status.isCancelled()).toBe(false)
    expect(meeting.status.isEnded()).toBe(false)
  })

  it('should emit MeetingScheduledEvent on creation', () => {
    const meeting = makeMeeting()
    const events = meeting.domainEvents
    expect(events).toHaveLength(1)
    expect(events[0]).toBeInstanceOf(MeetingScheduledEvent)
  })

  it('should not emit domain events when restored', () => {
    const existing = makeMeeting()
    const restored = Meeting.restore(
      { ...existing['props'] },
      existing.id,
    )
    expect(restored.domainEvents).toHaveLength(0)
  })

  it('should cancel and change status', () => {
    const meeting = makeMeeting()
    meeting.cancel()
    expect(meeting.status.isCancelled()).toBe(true)
  })

  it('should mark as ended and emit MeetingCompletedEvent', () => {
    const meeting = makeMeeting()
    meeting.clearEvents()
    meeting.markEnded(new Date())
    expect(meeting.status.isEnded()).toBe(true)
    expect(meeting.domainEvents[0]).toBeInstanceOf(MeetingCompletedEvent)
  })

  it('should set recording data', () => {
    const meeting = makeMeeting()
    meeting.setRecording('drive-id-123', 'https://drive.google.com/file/abc')
    expect(meeting.recordingDriveId).toBe('drive-id-123')
    expect(meeting.recordingUrl).toBe('https://drive.google.com/file/abc')
    expect(meeting.recordingMovedAt).not.toBeNull()
  })

  it('should set transcription job', () => {
    const meeting = makeMeeting()
    meeting.setTranscriptionJob('job-123')
    expect(meeting.transcriptionJobId).toBe('job-123')
  })

  it('should set transcript and clear job id', () => {
    const meeting = makeMeeting()
    meeting.setTranscriptionJob('job-123')
    meeting.setTranscript('Full transcript text here')
    expect(meeting.transcriptText).toBe('Full transcript text here')
    expect(meeting.transcriptionJobId).toBeNull()
    expect(meeting.transcribedAt).not.toBeNull()
  })

  it('should update summary', () => {
    const meeting = makeMeeting()
    meeting.updateSummary('Meeting was productive')
    expect(meeting.meetingSummary).toBe('Meeting was productive')
  })

  it('should update attendees', () => {
    const meeting = makeMeeting()
    meeting.updateAttendees([
      { email: 'b@test.com', responseStatus: 'accepted' },
    ])
    expect(meeting.attendees).toHaveLength(1)
    expect(meeting.attendees[0].email).toBe('b@test.com')
  })

  it('should update mutable fields', () => {
    const meeting = makeMeeting()
    meeting.update({ title: 'Updated Title', description: 'New desc' })
    expect(meeting.title).toBe('Updated Title')
    expect(meeting.description).toBe('New desc')
  })
})
