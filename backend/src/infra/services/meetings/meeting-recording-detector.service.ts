import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { IMeetingRepository } from '@/domain/meetings/application/repositories/i-meeting.repository'
import { ICalendarAdapter } from '@/domain/meetings/application/services/i-calendar.adapter'
import { MeetingFilesFinderService } from './meeting-files-finder.service'
import { TranscriptorService } from './transcriptor.service'
import { Meeting } from '@/domain/meetings/enterprise/entities/meeting'
import { Env } from '@/env/env'

@Injectable()
export class MeetingRecordingDetectorService {
  private readonly logger = new Logger(MeetingRecordingDetectorService.name)

  constructor(
    private readonly meetingRepo: IMeetingRepository,
    private readonly calendarAdapter: ICalendarAdapter,
    private readonly filesFinder: MeetingFilesFinderService,
    private readonly transcriptor: TranscriptorService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Cron('*/15 * * * *') // every 15 minutes
  async run(): Promise<void> {
    const calendarAdapter = this.config.get('CALENDAR_ADAPTER', { infer: true })
    if (calendarAdapter !== 'google-calendar') return

    const now = new Date()
    const pass0Ids = new Set<string>()

    // ── Pass 0: Drive-first — detect early/late meetings via new Drive files ──
    // Searches "Meet Recordings" for files created in the last 6 hours and
    // matches filename to scheduled meeting titles. Catches meetings that ran
    // early, late, or outside the scheduled window.
    try {
      const since6h = new Date(now.getTime() - 6 * 60 * 60 * 1000)
      const recentFiles = await this.filesFinder.listRecentDriveFiles(since6h)

      // Extract unique meeting titles from filenames.
      // Google Meet names files: "[Title] - YYYY/MM/DD HH:MM GMT±N - Recording"
      const titlesInDrive = new Set<string>()
      for (const f of recentFiles) {
        const match = f.name?.match(/^(.+?) - \d{4}\/\d{2}\/\d{2}/)
        if (match) titlesInDrive.add(match[1].toLowerCase())
      }

      if (titlesInDrive.size > 0) {
        const scheduledMeetings = await this.meetingRepo.findScheduledBefore(new Date(now.getTime() + 24 * 60 * 60 * 1000))

        for (const meeting of scheduledMeetings) {
          if (!titlesInDrive.has(meeting.title.toLowerCase())) continue
          pass0Ids.add(meeting.id.value)

          try {
            await this.processEndedMeeting(meeting, now, now)
          } catch (err) {
            this.logger.error(`Pass 0 error for meeting ${meeting.id.value}: ${err}`)
          }
        }
      }
    } catch (err) {
      this.logger.error(`Pass 0 Drive scan error: ${err}`)
    }

    // ── Pass 1: time-based fallback ───────────────────────────────────────────
    // Finds meetings whose scheduled start was > 30 min ago. Catches meetings
    // where no recording was created (e.g. host forgot to record).
    const earlyEndCutoff = new Date(now.getTime() - 30 * 60 * 1000)
    const pastScheduled = await this.meetingRepo.findScheduledBefore(earlyEndCutoff)

    for (const meeting of pastScheduled) {
      if (pass0Ids.has(meeting.id.value)) continue
      try {
        await this.processEndedMeeting(meeting, meeting.startAt, now)
      } catch (err) {
        this.logger.error(`Pass 1 error for meeting ${meeting.id.value}: ${err}`)
      }
    }

    // ── Pass 2: retry for ended meetings still missing files ─────────────────
    // Google can take > 15 min to process recordings. Retry up to 4 hours after end.
    const since4h = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const endedNoRecording = await this.meetingRepo.findEndedWithoutRecording(since4h)

    for (const meeting of endedNoRecording) {
      try {
        const searchRef = meeting.actualEndAt ?? meeting.startAt
        const found = await this.processFiles(meeting, searchRef, now)
        if (!found) {
          this.logger.debug(`Recording still pending for meeting ${meeting.id.value}`)
        }
      } catch (err) {
        this.logger.error(`Pass 2 error for meeting ${meeting.id.value}: ${err}`)
      }
    }
  }

  /**
   * Marks a scheduled meeting as ended, updates final RSVP from Calendar, and
   * searches Drive for recording + transcript.
   */
  private async processEndedMeeting(meeting: Meeting, searchRef: Date, now: Date): Promise<void> {
    // Fetch final RSVP statuses from Google Calendar (non-fatal)
    if (meeting.googleEventId) {
      try {
        const event = await this.calendarAdapter.getEvent(meeting.googleEventId)
        if (event?.attendees) {
          meeting.updateAttendees(event.attendees)
        }
      } catch { /* non-fatal */ }
    }

    meeting.markEnded(now)
    await this.meetingRepo.save(meeting)
    this.logger.log(`Marked meeting ${meeting.id.value} as ended`)

    await this.processFiles(meeting, searchRef, now)
  }

  /**
   * Searches Drive for recording + native transcript and processes them.
   * Returns true if at least one file was found.
   *
   * Transcript strategy (priority):
   *   1. Google Meet native Gemini doc → summary + optional raw transcript
   *   2. Fallback: submit recording video to external transcriptor service
   */
  private async processFiles(meeting: Meeting, searchRef: Date, now: Date): Promise<boolean> {
    if (!meeting.googleEventId) return false

    const { recording, nativeTranscript } = await this.filesFinder.findMeetingFiles(
      meeting.title,
      searchRef,
    )

    // ── Strategy 1: Google native Gemini doc ─────────────────────────────────
    if (nativeTranscript) {
      let summary: string | null = null
      let transcript: string | null = null

      try {
        const rawText = await this.filesFinder.exportGoogleDocText(nativeTranscript.fileId)
        const parsed = this.filesFinder.parseGoogleMeetDoc(rawText)
        summary = parsed.summary
        transcript = parsed.transcript
      } catch (err) {
        this.logger.warn(`Failed to export native transcript for meeting ${meeting.id.value}: ${err}`)
      }

      meeting.setNativeTranscript(nativeTranscript.webViewLink, summary, transcript)
      if (recording) meeting.setRecording(recording.fileId, recording.webViewLink)
      await this.meetingRepo.save(meeting)

      if (transcript) {
        // Raw transcript captured — no need for video transcription
        this.logger.log(`Native transcript saved for meeting ${meeting.id.value}`)
        return true
      }

      this.logger.log(`Gemini summary saved for meeting ${meeting.id.value} (no raw transcript)`)
      // Fall through: save summary but still try video transcription for full transcript
      if (!recording) return true
    }

    // ── Strategy 2: Fallback video transcription ──────────────────────────────
    // Used when: (a) no native doc at all, or (b) doc exists but has no raw transcript.
    if (!recording) return nativeTranscript !== null

    if (recording && !meeting.recordingDriveId) {
      meeting.setRecording(recording.fileId, recording.webViewLink)
      await this.meetingRepo.save(meeting)
    }

    // Submit to transcriptor only if not already submitted and native transcript has no raw text
    if (!meeting.transcriptionJobId) {
      try {
        const buffer = await this.filesFinder.downloadFile(recording.fileId)
        const jobId = await this.transcriptor.submitVideo(buffer, `meeting-${meeting.id.value}.mp4`)
        meeting.setTranscriptionJob(jobId)
        await this.meetingRepo.save(meeting)
        this.logger.log(`Video transcription queued for meeting ${meeting.id.value}, job: ${jobId}`)
      } catch (err) {
        this.logger.warn(`Failed to submit transcription for meeting ${meeting.id.value}: ${err}`)
      }
    }

    return true
  }
}
