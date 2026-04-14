import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UseGuards,
  Request,
  ForbiddenException,
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
import { CustomerPortalGuard } from '@/infra/auth/guards/customer-portal.guard'
import { CustomerRoles } from '@/infra/auth/decorators/customer-roles.decorator'
import { ListPortalMeetingsUseCase } from '@/domain/customers/application/use-cases/list-portal-meetings.use-case'
import { GetPortalMeetingUseCase } from '@/domain/customers/application/use-cases/get-portal-meeting.use-case'
import { CreateCustomerSubUserUseCase } from '@/domain/customers/application/use-cases/create-customer-sub-user.use-case'
import { ListCustomerPortalUsersUseCase } from '@/domain/customers/application/use-cases/list-customer-portal-users.use-case'
import { MeetingNotFoundError } from '@/domain/meetings/domain/exceptions/meeting-not-found.error'
import { MeetingPresenter } from '@/infra/presenters/meeting.presenter'
import { ForbiddenPortalActionError } from '@/domain/customers/domain/exceptions/forbidden-portal-action.error'
import { UserAlreadyExistsError } from '@/domain/auth/domain/exceptions/user-already-exists.error'

interface PortalRequest extends ExpressRequest {
  user: {
    userId: string
    role: string
    customerId: string
    customerRole: string
  }
}

class CreateSubUserDto {
  @ApiProperty({ example: 'member@company.com' })
  email!: string

  @ApiProperty({ example: 'Temp@1234' })
  password!: string

  @ApiProperty({ example: 'Maria Santos' })
  name!: string

  @ApiPropertyOptional({ example: '+5511888888888' })
  phone?: string
}

@ApiTags('Customer Portal')
@ApiBearerAuth()
@Controller('portal')
@UseGuards(JwtAuthGuard, CustomerPortalGuard)
export class PortalController {
  constructor(
    private readonly listPortalMeetings: ListPortalMeetingsUseCase,
    private readonly getPortalMeeting: GetPortalMeetingUseCase,
    private readonly createSubUser: CreateCustomerSubUserUseCase,
    private readonly listPortalUsers: ListCustomerPortalUsersUseCase,
  ) {}

  // ─── Meetings ─────────────────────────────────────────────────────────────

  @Get('meetings')
  @ApiOperation({ summary: "List the company's meetings (portal)" })
  @ApiQuery({ name: 'status', required: false, enum: ['scheduled', 'ended', 'cancelled'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of meetings' })
  async listMeetings(
    @Request() req: PortalRequest,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.listPortalMeetings.execute({
      customerId: req.user.customerId,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
    const { items, total } = result.value as { items: any[]; total: number }
    return { items: items.map(MeetingPresenter.toHTTP), total }
  }

  @Get('meetings/:meetingId')
  @ApiOperation({ summary: 'Get a meeting detail (portal)' })
  @ApiParam({ name: 'meetingId', type: String })
  @ApiResponse({ status: 200, description: 'Meeting data' })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  async getMeeting(
    @Request() req: PortalRequest,
    @Param('meetingId') meetingId: string,
  ) {
    const result = await this.getPortalMeeting.execute({
      customerId: req.user.customerId,
      meetingId,
    })
    if (result.isLeft()) {
      const err = result.value
      if (err instanceof MeetingNotFoundError) throw new NotFoundException(err.message)
      throw new BadRequestException((err as Error).message)
    }
    return { meeting: MeetingPresenter.toHTTP((result.value as any).meeting) }
  }

  // ─── Users (master only) ──────────────────────────────────────────────────

  @Get('users')
  @CustomerRoles('master')
  @ApiOperation({ summary: "List the company's portal users (master only)" })
  @ApiResponse({ status: 200, description: 'List of portal users' })
  @ApiResponse({ status: 403, description: 'Requires master role' })
  async listUsers(@Request() req: PortalRequest) {
    const result = await this.listPortalUsers.execute(req.user.customerId)
    return result.isRight() ? result.value : { users: [] }
  }

  @Post('users')
  @CustomerRoles('master')
  @ApiOperation({ summary: 'Create a member sub-user (master only)' })
  @ApiBody({ type: CreateSubUserDto })
  @ApiResponse({ status: 201, description: 'Sub-user created' })
  @ApiResponse({ status: 403, description: 'Requires master role' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async createUser(@Request() req: PortalRequest, @Body() body: CreateSubUserDto) {
    const result = await this.createSubUser.execute({
      customerId: req.user.customerId,
      requesterUserId: req.user.userId,
      email: body.email,
      password: body.password,
      name: body.name,
      phone: body.phone,
    })

    if (result.isLeft()) {
      const err = result.value
      if (err instanceof ForbiddenPortalActionError) throw new ForbiddenException(err.message)
      if (err instanceof UserAlreadyExistsError) throw new ConflictException(err.message)
      throw new BadRequestException((err as Error).message)
    }
    return result.value
  }
}
