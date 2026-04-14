import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, NotFoundException, HttpCode } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody, ApiResponse, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CreateSprintUseCase } from '@/domain/tasks/application/use-cases/create-sprint.use-case'
import { UpdateSprintUseCase } from '@/domain/tasks/application/use-cases/update-sprint.use-case'
import { DeleteSprintUseCase } from '@/domain/tasks/application/use-cases/delete-sprint.use-case'
import { ListSprintsUseCase } from '@/domain/tasks/application/use-cases/list-sprints.use-case'
import { SprintPresenter } from '@/infra/presenters/task.presenter'

class CreateSprintDto {
  @ApiProperty() name!: string
  @ApiProperty() startAt!: string
  @ApiProperty() endAt!: string
}

class UpdateSprintDto {
  @ApiPropertyOptional() name?: string
  @ApiPropertyOptional() startAt?: string
  @ApiPropertyOptional() endAt?: string
}

@ApiTags('Sprints')
@ApiBearerAuth()
@Controller('customers/:customerId/sprints')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class SprintsController {
  constructor(
    private readonly createSprint: CreateSprintUseCase,
    private readonly updateSprint: UpdateSprintUseCase,
    private readonly deleteSprint: DeleteSprintUseCase,
    private readonly listSprints: ListSprintsUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a sprint' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiBody({ type: CreateSprintDto })
  @ApiResponse({ status: 201 })
  async create(@Param('customerId') customerId: string, @Body() body: CreateSprintDto) {
    const result = await this.createSprint.execute({
      customerId, name: body.name, startAt: new Date(body.startAt), endAt: new Date(body.endAt),
    })
    return { sprintId: result.value.sprintId }
  }

  @Get()
  @ApiOperation({ summary: 'List sprints for a customer' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiResponse({ status: 200 })
  async list(@Param('customerId') customerId: string) {
    const result = await this.listSprints.execute({ customerId })
    return { sprints: result.value.sprints.map(SprintPresenter.toHTTP) }
  }

  @Patch(':sprintId')
  @ApiOperation({ summary: 'Update a sprint' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiBody({ type: UpdateSprintDto })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async update(@Param('sprintId') sprintId: string, @Body() body: UpdateSprintDto) {
    const result = await this.updateSprint.execute({
      sprintId, name: body.name,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined,
    })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return { sprintId: result.value.sprintId }
  }

  @Delete(':sprintId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a sprint' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  async delete(@Param('sprintId') sprintId: string) {
    const result = await this.deleteSprint.execute({ sprintId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }
}
