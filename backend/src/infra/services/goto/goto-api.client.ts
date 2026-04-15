import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoToTokenService } from './goto-token.service'
import { Env } from '@/env/env'

export interface GoToCallReport {
  conversationSpaceId: string
  startTime: string
  endTime?: string
  durationSeconds?: number
  callOutcome?: string    // answered | voicemail | no_answer | busy | failed
  recordingId?: string
  callee?: string
  caller?: string
  direction?: string      // inbound | outbound
}

@Injectable()
export class GoToApiClient {
  private readonly logger = new Logger(GoToApiClient.name)
  private readonly baseUrl = 'https://api.goto.com'

  constructor(
    private readonly tokenService: GoToTokenService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async getCallReport(conversationSpaceId: string): Promise<GoToCallReport | null> {
    try {
      const token = await this.tokenService.getValidToken()
      const resp = await fetch(
        `${this.baseUrl}/call-events-report/v1/reports/${conversationSpaceId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (resp.status === 404) return null
      if (!resp.ok) {
        this.logger.warn(`GoTo getCallReport ${resp.status} for ${conversationSpaceId}`)
        return null
      }

      const data = await resp.json() as Record<string, unknown>
      return this.mapCallReport(conversationSpaceId, data)
    } catch (err) {
      this.logger.error(`GoTo getCallReport error: ${err}`)
      return null
    }
  }

  async downloadRecording(recordingId: string): Promise<Buffer | null> {
    try {
      const token = await this.tokenService.getValidToken()
      const accountKey = this.config.get('GOTO_ACCOUNT_KEY', { infer: true })

      const resp = await fetch(
        `${this.baseUrl}/call-reports/v1/accounts/${accountKey}/recordings/${recordingId}/download`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (!resp.ok) {
        this.logger.warn(`GoTo downloadRecording ${resp.status} for ${recordingId}`)
        return null
      }

      const arrayBuffer = await resp.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (err) {
      this.logger.error(`GoTo downloadRecording error: ${err}`)
      return null
    }
  }

  private mapCallReport(conversationSpaceId: string, data: Record<string, unknown>): GoToCallReport {
    // GoTo API response shape varies — we extract what we need defensively
    const legs = (data.legs as Record<string, unknown>[] | undefined) ?? []
    const firstLeg = legs[0] as Record<string, unknown> | undefined

    const duration = typeof data.durationSeconds === 'number'
      ? data.durationSeconds
      : typeof firstLeg?.durationSeconds === 'number'
        ? firstLeg.durationSeconds
        : undefined

    return {
      conversationSpaceId,
      startTime: (data.startTime ?? firstLeg?.startTime ?? '') as string,
      endTime: (data.endTime ?? firstLeg?.endTime) as string | undefined,
      durationSeconds: duration,
      callOutcome: (data.callOutcome ?? data.outcome ?? firstLeg?.callOutcome) as string | undefined,
      recordingId: (data.recordingId ?? firstLeg?.recordingId) as string | undefined,
      callee: (data.callee ?? firstLeg?.callee) as string | undefined,
      caller: (data.caller ?? firstLeg?.caller) as string | undefined,
      direction: (data.direction ?? firstLeg?.direction) as string | undefined,
    }
  }
}
