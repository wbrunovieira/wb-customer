import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Request as ExpressRequest } from 'express'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { ScheduleMeetingUseCase } from '@/domain/meetings/application/use-cases/schedule-meeting.use-case'
import { GetMeetingUseCase } from '@/domain/meetings/application/use-cases/get-meeting.use-case'
import { ListCustomerMeetingsUseCase } from '@/domain/meetings/application/use-cases/list-customer-meetings.use-case'
import { UpdateMeetingUseCase } from '@/domain/meetings/application/use-cases/update-meeting.use-case'
import { CancelMeetingUseCase } from '@/domain/meetings/application/use-cases/cancel-meeting.use-case'
import { UpdateMeetingSummaryUseCase } from '@/domain/meetings/application/use-cases/update-meeting-summary.use-case'
import { MeetingNotFoundError } from '@/domain/meetings/domain/exceptions/meeting-not-found.error'
import { MeetingAlreadyCancelledError } from '@/domain/meetings/domain/exceptions/meeting-already-cancelled.error'
import { MeetingTypeNotFoundError } from '@/domain/meetings/domain/exceptions/meeting-type-not-found.error'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { MeetingPresenter } from '@/infra/presenters/meeting.presenter'

interface AuthenticatedRequest extends ExpressRequest {
  user: { userId: string; role: string }
}

class ScheduleMeetingDto {
  @ApiPropertyOptional({ example: 'contact-uuid' })
  contactId?: string

  @ApiPropertyOptional({ example: 'meeting-type-uuid' })
  meetingTypeId?: string

  @ApiProperty({ example: 'Kickoff Meeting' })
  title!: string

  @ApiPropertyOptional({ example: 'Initial kickoff with the client team' })
  description?: string

  @ApiProperty({ example: '2026-05-01T10:00:00Z' })
  startAt!: string

  @ApiProperty({ example: '2026-05-01T11:00:00Z' })
  endAt!: string

  @ApiProperty({ example: ['client@company.com', 'pm@agency.com'], type: [String] })
  attendeeEmails!: string[]

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  timeZone?: string
}

class UpdateMeetingDto {
  @ApiPropertyOptional({ example: 'Updated Meeting Title' })
  title?: string

  @ApiPropertyOptional({ example: 'Updated description' })
  description?: string

  @ApiPropertyOptional({ example: '2026-05-02T10:00:00Z' })
  startAt?: string

  @ApiPropertyOptional({ example: '2026-05-02T11:00:00Z' })
  endAt?: string

  @ApiPropertyOptional({ example: ['a@test.com'], type: [String] })
  attendeeEmails?: string[]

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  timeZone?: string
}

class UpdateMeetingSummaryDto {
  @ApiPropertyOptional({ example: 'The client agreed on the next steps...', nullable: true })
  summary!: string | null
}

@ApiTags('Meetings')
@ApiBearerAuth()
@Controller('customers/:customerId/meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class MeetingsController {
  constructor(
    private readonly scheduleMeetingUseCase: ScheduleMeetingUseCase,
    private readonly getMeetingUseCase: GetMeetingUseCase,
    private readonly listCustomerMeetingsUseCase: ListCustomerMeetingsUseCase,
    private readonly updateMeetingUseCase: UpdateMeetingUseCase,
    private readonly cancelMeetingUseCase: CancelMeetingUseCase,
    private readonly updateMeetingSummaryUseCase: UpdateMeetingSummaryUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Schedule a new meeting for a customer' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiBody({ type: ScheduleMeetingDto })
  @ApiResponse({ status: 201, description: 'Meeting scheduled' })
  @ApiResponse({ status: 404, description: 'Customer or meeting type not found' })
  async schedule(
    @Param('customerId') customerId: string,
    @Body() body: ScheduleMeetingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.scheduleMeetingUseCase.execute({
      customerId,
      contactId: body.contactId,
      meetingTypeId: body.meetingTypeId,
      title: body.title,
      description: body.description,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      attendeeEmails: body.attendeeEmails,
      timeZone: body.timeZone,
      scheduledByUserId: req.user.userId,
    })

    if (result.isLeft()) {
      const err = result.value
      if (err instanceof CustomerNotFoundError || err instanceof MeetingTypeNotFoundError) {
        throw new NotFoundException(err.message)
      }
      throw new BadRequestException((err as Error).message)
    }
    return result.value
  }

  @Get()
  @ApiOperation({ summary: 'List meetings for a customer' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['scheduled', 'ended', 'cancelled'] })
  @ApiQuery({ name: 'meetingTypeId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of meetings' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async list(
    @Param('customerId') customerId: string,
    @Query('status') status?: string,
    @Query('meetingTypeId') meetingTypeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.listCustomerMeetingsUseCase.execute({
      customerId,
      status,
      meetingTypeId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })

    if (result.isLeft()) {
      const err = result.value
      if (err instanceof CustomerNotFoundError) throw new NotFoundException(err.message)
      throw new BadRequestException((err as Error).message)
    }
    const { items, total } = result.value
    return { items: items.map(MeetingPresenter.toHTTP), total }
  }

  @Get(':meetingId')
  @ApiOperation({ summary: 'Get a meeting by ID' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'meetingId', type: String })
  @ApiResponse({ status: 200, description: 'Meeting data' })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  async get(
    @Param('customerId') customerId: string,
    @Param('meetingId') meetingId: string,
  ) {
    const result = await this.getMeetingUseCase.execute({ customerId, meetingId })
    if (result.isLeft()) {
      throw new NotFoundException(result.value.message)
    }
    return { meeting: MeetingPresenter.toHTTP(result.value.meeting) }
  }

  @Patch(':meetingId')
  @ApiOperation({ summary: 'Update a meeting' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'meetingId', type: String })
  @ApiBody({ type: UpdateMeetingDto })
  @ApiResponse({ status: 200, description: 'Meeting updated' })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  @ApiResponse({ status: 409, description: 'Meeting is already cancelled' })
  async update(
    @Param('customerId') customerId: string,
    @Param('meetingId') meetingId: string,
    @Body() body: UpdateMeetingDto,
  ) {
    const result = await this.updateMeetingUseCase.execute({
      customerId,
      meetingId,
      title: body.title,
      description: body.description,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined,
      attendeeEmails: body.attendeeEmails,
      timeZone: body.timeZone,
    })

    if (result.isLeft()) {
      const err = result.value
      if (err instanceof MeetingNotFoundError) throw new NotFoundException(err.message)
      if (err instanceof MeetingAlreadyCancelledError) throw new BadRequestException(err.message)
      throw new BadRequestException((err as Error).message)
    }
    return {}
  }

  @Delete(':meetingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a meeting' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'meetingId', type: String })
  @ApiResponse({ status: 204, description: 'Meeting cancelled' })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  @ApiResponse({ status: 400, description: 'Meeting already cancelled' })
  async cancel(
    @Param('customerId') customerId: string,
    @Param('meetingId') meetingId: string,
  ) {
    const result = await this.cancelMeetingUseCase.execute({ customerId, meetingId })
    if (result.isLeft()) {
      const err = result.value
      if (err instanceof MeetingNotFoundError) throw new NotFoundException(err.message)
      if (err instanceof MeetingAlreadyCancelledError) throw new BadRequestException(err.message)
      throw new BadRequestException((err as Error).message)
    }
  }

  @Patch(':meetingId/summary')
  @ApiOperation({ summary: 'Update the meeting summary/notes' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'meetingId', type: String })
  @ApiBody({ type: UpdateMeetingSummaryDto })
  @ApiResponse({ status: 200, description: 'Summary updated' })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  async updateSummary(
    @Param('customerId') customerId: string,
    @Param('meetingId') meetingId: string,
    @Body() body: UpdateMeetingSummaryDto,
  ) {
    const result = await this.updateMeetingSummaryUseCase.execute({
      meetingId,
      summary: body.summary,
    })
    if (result.isLeft()) {
      throw new NotFoundException(result.value.message)
    }
    return {}
  }
}
