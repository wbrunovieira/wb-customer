import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, NotFoundException, HttpCode } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CurrentUser } from '@/infra/auth/decorators/current-user.decorator'
import { CreateActivityUseCase } from '@/domain/activities/application/use-cases/create-activity.use-case'
import { UpdateActivityUseCase } from '@/domain/activities/application/use-cases/update-activity.use-case'
import { GetActivityUseCase } from '@/domain/activities/application/use-cases/get-activity.use-case'
import { ListCustomerActivitiesUseCase } from '@/domain/activities/application/use-cases/list-customer-activities.use-case'
import { DeleteActivityUseCase } from '@/domain/activities/application/use-cases/delete-activity.use-case'
import { Activity } from '@/domain/activities/enterprise/entities/activity'

class CreateActivityDto {
  @ApiProperty() type!: string
  @ApiPropertyOptional() contactId?: string
  @ApiPropertyOptional() status?: string
  @ApiPropertyOptional() subject?: string
  @ApiPropertyOptional() description?: string
  @ApiPropertyOptional() scheduledAt?: string
  @ApiPropertyOptional() occurredAt?: string
  @ApiPropertyOptional() durationSecs?: number
  @ApiPropertyOptional() direction?: string
  @ApiPropertyOptional() assignedToUserId?: string
}

class UpdateActivityDto {
  @ApiPropertyOptional() subject?: string
  @ApiPropertyOptional() description?: string
  @ApiPropertyOptional() status?: string
  @ApiPropertyOptional() scheduledAt?: string | null
  @ApiPropertyOptional() occurredAt?: string | null
  @ApiPropertyOptional() durationSecs?: number | null
  @ApiPropertyOptional() assignedToUserId?: string | null
  @ApiPropertyOptional() transcriptText?: string | null
}

function toHttp(a: Activity) {
  return {
    id: a.id.value,
    customerId: a.customerId,
    contactId: a.contactId ?? null,
    type: a.type,
    status: a.status,
    subject: a.subject ?? null,
    description: a.description ?? null,
    scheduledAt: a.scheduledAt?.toISOString() ?? null,
    occurredAt: a.occurredAt?.toISOString() ?? null,
    durationSecs: a.durationSecs ?? null,
    audioUrl: a.audioUrl ?? null,
    transcriptText: a.transcriptText ?? null,
    direction: a.direction ?? null,
    createdByUserId: a.createdByUserId,
    assignedToUserId: a.assignedToUserId ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    // GoTo Connect
    gotoCallOutcome: a.gotoCallOutcome ?? null,
    gotoDuration: a.gotoDuration ?? null,
    gotoRecordingUrl: a.gotoRecordingUrl ?? null,
    gotoRecordingUrl2: a.gotoRecordingUrl2 ?? null,
    gotoTranscriptText: a.gotoTranscriptText ?? null,
    callContactType: a.callContactType ?? null,
    // Email
    emailMessageId: a.emailMessageId ?? null,
    emailThreadId: a.emailThreadId ?? null,
    emailSubject: a.emailSubject ?? null,
    emailFromAddress: a.emailFromAddress ?? null,
    emailFromName: a.emailFromName ?? null,
    emailReplied: a.emailReplied,
    // WhatsApp messages
    whatsappMessages: a.whatsappMessages ?? [],
  }
}

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('customers/:customerId/activities')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class ActivitiesController {
  constructor(
    private readonly createActivity: CreateActivityUseCase,
    private readonly updateActivity: UpdateActivityUseCase,
    private readonly getActivity: GetActivityUseCase,
    private readonly listActivities: ListCustomerActivitiesUseCase,
    private readonly deleteActivity: DeleteActivityUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new activity for a customer' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiBody({ type: CreateActivityDto })
  @ApiResponse({ status: 201 })
  async create(
    @Param('customerId') customerId: string,
    @Body() body: CreateActivityDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.createActivity.execute({
      customerId,
      contactId: body.contactId,
      type: body.type,
      status: body.status,
      subject: body.subject,
      description: body.description,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
      durationSecs: body.durationSecs,
      direction: body.direction,
      createdByUserId: user.userId,
      assignedToUserId: body.assignedToUserId,
    })
    return { activityId: result.value.activityId }
  }

  @Get()
  @ApiOperation({ summary: 'List activities for a customer' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200 })
  async list(
    @Param('customerId') customerId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.listActivities.execute({
      customerId,
      type,
      status,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    })
    const { items, total } = result.value
    return { items: items.map(toHttp), total }
  }

  @Get(':activityId')
  @ApiOperation({ summary: 'Get a single activity' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'activityId', type: String })
  @ApiResponse({ status: 200 })
  async getOne(@Param('activityId') activityId: string) {
    const result = await this.getActivity.execute(activityId)
    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return { activity: toHttp(result.value.activity) }
  }

  @Patch(':activityId')
  @ApiOperation({ summary: 'Update an activity' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'activityId', type: String })
  @ApiBody({ type: UpdateActivityDto })
  @ApiResponse({ status: 200 })
  @HttpCode(200)
  async update(@Param('activityId') activityId: string, @Body() body: UpdateActivityDto) {
    const result = await this.updateActivity.execute({
      activityId,
      subject: body.subject,
      description: body.description,
      status: body.status,
      scheduledAt: body.scheduledAt !== undefined ? (body.scheduledAt ? new Date(body.scheduledAt) : null) : undefined,
      occurredAt: body.occurredAt !== undefined ? (body.occurredAt ? new Date(body.occurredAt) : null) : undefined,
      durationSecs: body.durationSecs,
      assignedToUserId: body.assignedToUserId,
      transcriptText: body.transcriptText,
    })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return { activityId: result.value.activityId }
  }

  @Delete(':activityId')
  @ApiOperation({ summary: 'Delete an activity (soft delete)' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'activityId', type: String })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  async remove(@Param('activityId') activityId: string) {
    const result = await this.deleteActivity.execute(activityId)
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }
}
