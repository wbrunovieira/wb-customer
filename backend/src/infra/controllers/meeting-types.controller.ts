import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UseGuards,
  Query,
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
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CreateMeetingTypeUseCase } from '@/domain/meetings/application/use-cases/create-meeting-type.use-case'
import { ListMeetingTypesUseCase } from '@/domain/meetings/application/use-cases/list-meeting-types.use-case'
import { UpdateMeetingTypeUseCase } from '@/domain/meetings/application/use-cases/update-meeting-type.use-case'
import { DeleteMeetingTypeUseCase } from '@/domain/meetings/application/use-cases/delete-meeting-type.use-case'
import { MeetingTypeNotFoundError } from '@/domain/meetings/domain/exceptions/meeting-type-not-found.error'
import { MeetingTypeAlreadyExistsError } from '@/domain/meetings/domain/exceptions/meeting-type-already-exists.error'

class CreateMeetingTypeDto {
  @ApiProperty({ example: 'Discovery Call' })
  name!: string

  @ApiPropertyOptional({ example: 'Initial discovery session with the client' })
  description?: string

  @ApiPropertyOptional({ example: 60 })
  durationMinutes?: number

  @ApiPropertyOptional({ example: '#3B82F6' })
  color?: string
}

class UpdateMeetingTypeDto {
  @ApiPropertyOptional({ example: 'Updated Call' })
  name?: string

  @ApiPropertyOptional({ example: 'Updated description' })
  description?: string

  @ApiPropertyOptional({ example: 45 })
  durationMinutes?: number

  @ApiPropertyOptional({ example: '#EF4444' })
  color?: string

  @ApiPropertyOptional({ example: true })
  isActive?: boolean
}

@ApiTags('Meeting Types')
@ApiBearerAuth()
@Controller('meeting-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class MeetingTypesController {
  constructor(
    private readonly createMeetingTypeUseCase: CreateMeetingTypeUseCase,
    private readonly listMeetingTypesUseCase: ListMeetingTypesUseCase,
    private readonly updateMeetingTypeUseCase: UpdateMeetingTypeUseCase,
    private readonly deleteMeetingTypeUseCase: DeleteMeetingTypeUseCase,
  ) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a meeting type' })
  @ApiBody({ type: CreateMeetingTypeDto })
  @ApiResponse({ status: 201, description: 'Meeting type created' })
  @ApiResponse({ status: 409, description: 'Meeting type with this name already exists' })
  async create(@Body() body: CreateMeetingTypeDto) {
    const result = await this.createMeetingTypeUseCase.execute(body)
    if (result.isLeft()) {
      const err = result.value
      if (err instanceof MeetingTypeAlreadyExistsError) throw new ConflictException(err.message)
      throw new BadRequestException((err as Error).message)
    }
    return result.value
  }

  @Get()
  @ApiOperation({ summary: 'List all meeting types' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of meeting types' })
  async list(@Query('onlyActive') onlyActive?: string) {
    const result = await this.listMeetingTypesUseCase.execute(onlyActive !== 'false')
    return result.value
  }

  @Patch(':meetingTypeId')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a meeting type' })
  @ApiParam({ name: 'meetingTypeId', type: String })
  @ApiBody({ type: UpdateMeetingTypeDto })
  @ApiResponse({ status: 200, description: 'Meeting type updated' })
  @ApiResponse({ status: 404, description: 'Meeting type not found' })
  async update(@Param('meetingTypeId') meetingTypeId: string, @Body() body: UpdateMeetingTypeDto) {
    const result = await this.updateMeetingTypeUseCase.execute({ meetingTypeId, ...body })
    if (result.isLeft()) {
      const err = result.value
      if (err instanceof MeetingTypeNotFoundError) throw new NotFoundException(err.message)
      throw new BadRequestException((err as Error).message)
    }
    return {}
  }

  @Delete(':meetingTypeId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a meeting type' })
  @ApiParam({ name: 'meetingTypeId', type: String })
  @ApiResponse({ status: 204, description: 'Meeting type deleted' })
  @ApiResponse({ status: 404, description: 'Meeting type not found' })
  async remove(@Param('meetingTypeId') meetingTypeId: string) {
    const result = await this.deleteMeetingTypeUseCase.execute(meetingTypeId)
    if (result.isLeft()) {
      const err = result.value
      if (err instanceof MeetingTypeNotFoundError) throw new NotFoundException(err.message)
      throw new BadRequestException((err as Error).message)
    }
  }
}
