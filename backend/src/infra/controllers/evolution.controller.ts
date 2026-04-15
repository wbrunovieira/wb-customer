import {
  Controller,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
  Param,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UseGuards } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { ApiProperty } from '@nestjs/swagger'
import { Env } from '@/env/env'
import { WhatsAppWebhookService } from '@/infra/services/whatsapp/whatsapp-webhook.service'
import { WhatsAppMediaService } from '@/infra/services/whatsapp/whatsapp-media.service'
import { EvolutionApiClient } from '@/infra/services/whatsapp/evolution-api.client'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CurrentUser } from '@/infra/auth/decorators/current-user.decorator'

class SendWhatsAppDto {
  @ApiProperty({ example: '5511999998888', description: 'Phone number (digits only or E.164)' })
  to!: string

  @ApiProperty({ example: 'Olá, tudo bem?' })
  text!: string
}

@ApiTags('WhatsApp (Evolution API)')
@Controller('evolution')
export class EvolutionController {
  private readonly logger = new Logger(EvolutionController.name)

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly webhookService: WhatsAppWebhookService,
    private readonly mediaService: WhatsAppMediaService,
    private readonly evolutionClient: EvolutionApiClient,
  ) {}

  /**
   * Receives all Evolution API webhooks.
   * Secured by x-webhook-secret header. Never returns 5xx.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Evolution API webhook (messages.upsert etc.)' })
  @ApiResponse({ status: 200, description: 'Webhook accepted' })
  @ApiResponse({ status: 401, description: 'Invalid secret' })
  async webhook(
    @Headers('x-webhook-secret') secret: string,
    @Body() body: Record<string, unknown>,
  ) {
    const expected = this.config.get('EVOLUTION_WEBHOOK_SECRET', { infer: true })
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid webhook secret')

    this.webhookService.process(body).catch((err) =>
      this.logger.error(`WhatsApp webhook processing error: ${err}`),
    )

    return { ok: true }
  }

  /**
   * Cron endpoint: polls Transcriptor for pending WhatsApp audio transcriptions.
   * POST /api/v1/evolution/check-transcriptions?secret=CRON_SECRET
   */
  @Post('check-transcriptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger WhatsApp transcription poll job (external cron)' })
  @ApiQuery({ name: 'secret', required: true, description: 'CRON_SECRET' })
  @ApiResponse({ status: 200, description: 'Job triggered' })
  @ApiResponse({ status: 401, description: 'Invalid secret' })
  async checkTranscriptions(@Query('secret') secret: string) {
    const cronSecret = this.config.get('CRON_SECRET', { infer: true })
    if (!cronSecret || secret !== cronSecret) throw new UnauthorizedException('Invalid cron secret')
    await this.mediaService.pollTranscriptions()
    return { ok: true }
  }

  /**
   * Send a WhatsApp message to a phone number from a customer context.
   */
  @Post('customers/:customerId/send')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiOperation({ summary: 'Send WhatsApp message to a customer contact' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiBody({ type: SendWhatsAppDto })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async send(
    @Param('customerId') customerId: string,
    @Body() body: SendWhatsAppDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.evolutionClient.sendText(body.to, body.text)

    if (!result) {
      return { ok: false, messageId: undefined }
    }

    await this.webhookService.recordSentMessage({
      customerId,
      remoteJid: `${body.to}@s.whatsapp.net`,
      messageId: result.messageId,
      text: body.text,
      createdByUserId: user.userId,
    })

    return { ok: true, messageId: result.messageId }
  }
}
