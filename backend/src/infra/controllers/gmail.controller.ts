import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Logger,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Env } from '@/env/env'
import { GmailPollerService } from '@/infra/services/gmail/gmail-poller.service'
import { GmailService } from '@/infra/services/gmail/gmail.service'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { CurrentUser } from '@/infra/auth/decorators/current-user.decorator'

class SendEmailAttachmentDto {
  @ApiProperty() fileName!: string
  @ApiProperty() mimeType!: string
  @ApiProperty({ description: 'Base64-encoded file content' }) base64!: string
}

class SendEmailDto {
  @ApiProperty({ example: ['contato@empresa.com'] })
  to!: string[]

  @ApiPropertyOptional({ example: ['cc@empresa.com'] })
  cc?: string[]

  @ApiProperty({ example: 'Proposta comercial' })
  subject!: string

  @ApiProperty({ example: '<p>Olá, segue a proposta...</p>' })
  htmlBody!: string

  @ApiPropertyOptional({ description: 'Gmail thread ID for replies' })
  threadId?: string

  @ApiPropertyOptional({ type: [SendEmailAttachmentDto] })
  attachments?: SendEmailAttachmentDto[]
}

@ApiTags('Gmail')
@Controller()
export class GmailController {
  private readonly logger = new Logger(GmailController.name)

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly pollerService: GmailPollerService,
    private readonly gmailService: GmailService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Cron endpoint: polls Gmail inbox for new emails → creates Activities.
   * GET /api/v1/google/gmail-poll  (header: x-api-key: INTERNAL_API_KEY)
   */
  @Get('google/gmail-poll')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger Gmail inbox poll (external cron)' })
  @ApiResponse({ status: 200, description: 'Poll triggered' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async gmailPoll(@Headers('x-api-key') apiKey: string) {
    const expected = this.config.get('INTERNAL_API_KEY', { infer: true })
    if (!expected || apiKey !== expected) throw new UnauthorizedException('Invalid API key')

    this.pollerService.poll().catch((err) =>
      this.logger.error(`Gmail poll error: ${err}`),
    )

    return { ok: true }
  }

  /**
   * Send an email from the customer context.
   * POST /api/v1/customers/:customerId/email
   */
  @Post('customers/:customerId/email')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiOperation({ summary: 'Send email to/from a customer contact' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiBody({ type: SendEmailDto })
  @ApiResponse({ status: 201, description: 'Email sent' })
  @ApiResponse({ status: 400, description: 'Google not connected or missing fields' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendEmail(
    @Param('customerId') customerId: string,
    @Body() body: SendEmailDto,
    @CurrentUser() user: { userId: string },
  ) {
    if (!body.to?.length) throw new BadRequestException('At least one recipient required')

    const attachments = body.attachments?.length
      ? body.attachments.map((att) => ({
          fileName: att.fileName,
          mimeType: att.mimeType,
          buffer: Buffer.from(att.base64, 'base64'),
        }))
      : undefined

    const result = await this.gmailService.sendEmail({
      to: body.to,
      cc: body.cc,
      subject: body.subject,
      htmlBody: body.htmlBody,
      threadId: body.threadId,
      attachments,
    })

    // Create Activity for sent email
    await this.prisma.activity.create({
      data: {
        customerId,
        type: 'email',
        status: 'done',
        subject: body.subject,
        description: body.htmlBody.replace(/<[^>]+>/g, '').slice(0, 500),
        emailMessageId: result.messageId,
        emailThreadId: result.threadId,
        emailSubject: body.subject,
        emailReplied: false,
        occurredAt: new Date(),
        createdByUserId: user.userId,
      },
    })

    // If reply — mark original thread emails as replied
    if (body.threadId) {
      await this.prisma.activity.updateMany({
        where: {
          emailThreadId: body.threadId,
          emailFromAddress: { not: null },
          emailReplied: false,
        },
        data: { emailReplied: true },
      })
    }

    return { ok: true, messageId: result.messageId, threadId: result.threadId }
  }
}
