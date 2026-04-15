import {
  Controller,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger'
import { Env } from '@/env/env'
import { GoToWebhookService } from '@/infra/services/goto/goto-webhook.service'
import { GoToRecordingService } from '@/infra/services/goto/goto-recording.service'
import { GoToTranscriptionService } from '@/infra/services/goto/goto-transcription.service'

@ApiTags('GoTo Connect')
@Controller('goto')
export class GoToController {
  private readonly logger = new Logger(GoToController.name)

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly webhookService: GoToWebhookService,
    private readonly recordingService: GoToRecordingService,
    private readonly transcriptionService: GoToTranscriptionService,
  ) {}

  /**
   * Receives REPORT_SUMMARY webhooks from GoTo Connect.
   * Secured by ?secret= query param. Never returns 5xx (avoids retry loops).
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive GoTo call webhook (REPORT_SUMMARY)' })
  @ApiQuery({ name: 'secret', required: true, description: 'GOTO_WEBHOOK_SECRET' })
  @ApiResponse({ status: 200, description: 'Webhook accepted' })
  @ApiResponse({ status: 401, description: 'Invalid secret' })
  async webhook(
    @Query('secret') secret: string,
    @Body() body: Record<string, unknown>,
  ) {
    const expected = this.config.get('GOTO_WEBHOOK_SECRET', { infer: true })
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid webhook secret')

    // Process in background — always return 200 to avoid GoTo retries
    this.webhookService.process(body).catch((err) =>
      this.logger.error(`GoTo webhook processing error: ${err}`),
    )

    return { ok: true }
  }

  /**
   * Cron endpoint: downloads pending GoTo call recordings → Drive + queues transcription.
   * Called every 10 min by external cron: POST /api/v1/goto/check-recordings?secret=CRON_SECRET
   */
  @Post('check-recordings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger GoTo recording download job (external cron)' })
  @ApiQuery({ name: 'secret', required: true, description: 'CRON_SECRET' })
  @ApiResponse({ status: 200, description: 'Job triggered' })
  @ApiResponse({ status: 401, description: 'Invalid secret' })
  async checkRecordings(@Query('secret') secret: string) {
    const cronSecret = this.config.get('CRON_SECRET', { infer: true })
    if (!cronSecret || secret !== cronSecret) throw new UnauthorizedException('Invalid cron secret')
    await this.recordingService.run()
    return { ok: true }
  }

  /**
   * Cron endpoint: polls Transcriptor for pending GoTo call transcriptions.
   * Called every 10 min by external cron: POST /api/v1/goto/check-transcriptions?secret=CRON_SECRET
   */
  @Post('check-transcriptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger GoTo transcription poll job (external cron)' })
  @ApiQuery({ name: 'secret', required: true, description: 'CRON_SECRET' })
  @ApiResponse({ status: 200, description: 'Job triggered' })
  @ApiResponse({ status: 401, description: 'Invalid secret' })
  async checkTranscriptions(@Query('secret') secret: string) {
    const cronSecret = this.config.get('CRON_SECRET', { infer: true })
    if (!cronSecret || secret !== cronSecret) throw new UnauthorizedException('Invalid cron secret')
    await this.transcriptionService.run()
    return { ok: true }
  }
}
