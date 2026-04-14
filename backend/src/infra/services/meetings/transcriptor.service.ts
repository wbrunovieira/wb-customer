import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Env } from '@/env/env'

export type TranscriptionStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface TranscriptionJobResult {
  jobId: string
  status: TranscriptionStatus
  error?: string
}

export interface TranscriptionResult {
  text: string
  language: string
  durationSeconds: number
}

@Injectable()
export class TranscriptorService {
  private readonly logger = new Logger(TranscriptorService.name)

  constructor(private readonly config: ConfigService<Env, true>) {}

  private baseUrl(): string {
    return this.config.get('TRANSCRIPTOR_BASE_URL', { infer: true }) ?? ''
  }

  private apiKey(): string {
    return this.config.get('TRANSCRIPTOR_API_KEY', { infer: true }) ?? ''
  }

  private isConfigured(): boolean {
    return !!this.baseUrl() && !!this.apiKey()
  }

  /**
   * Submits an MP4 video buffer to the transcriptor API.
   * Returns the jobId to poll later.
   */
  async submitVideo(buffer: Buffer, fileName: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Transcriptor not configured (TRANSCRIPTOR_BASE_URL / TRANSCRIPTOR_API_KEY)')
    }

    const formData = new FormData()
    formData.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: 'video/mp4' }),
      fileName,
    )

    const res = await fetch(`${this.baseUrl()}/transcriptions/video`, {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey() },
      body: formData,
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Transcriptor upload failed ${res.status}: ${body}`)
    }

    const data = (await res.json()) as { job_id: string; status: string }
    this.logger.log(`Transcription job submitted: ${data.job_id}`)
    return data.job_id
  }

  /**
   * Polls the status of a transcription job.
   */
  async getStatus(jobId: string): Promise<TranscriptionJobResult> {
    if (!this.isConfigured()) throw new Error('Transcriptor not configured')

    const res = await fetch(`${this.baseUrl()}/transcriptions/${jobId}`, {
      headers: { 'X-API-Key': this.apiKey() },
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Transcriptor status check failed ${res.status}: ${body}`)
    }

    const data = (await res.json()) as { job_id: string; status: string; error?: string }
    return {
      jobId: data.job_id,
      status: data.status as TranscriptionStatus,
      error: data.error,
    }
  }

  /**
   * Fetches the final transcript text. Only call when status = 'done'.
   */
  async getResult(jobId: string): Promise<TranscriptionResult> {
    if (!this.isConfigured()) throw new Error('Transcriptor not configured')

    const res = await fetch(`${this.baseUrl()}/transcriptions/${jobId}/result`, {
      headers: { 'X-API-Key': this.apiKey() },
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Transcriptor result fetch failed ${res.status}: ${body}`)
    }

    const data = (await res.json()) as {
      text: string
      language: string
      duration_seconds: number
    }
    return {
      text: data.text,
      language: data.language,
      durationSeconds: data.duration_seconds,
    }
  }
}
