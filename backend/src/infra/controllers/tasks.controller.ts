import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, NotFoundException, BadRequestException, HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CurrentUser } from '@/infra/auth/decorators/current-user.decorator'
import { CreateTaskUseCase } from '@/domain/tasks/application/use-cases/create-task.use-case'
import { UpdateTaskUseCase } from '@/domain/tasks/application/use-cases/update-task.use-case'
import { DeleteTaskUseCase } from '@/domain/tasks/application/use-cases/delete-task.use-case'
import { GetTaskUseCase } from '@/domain/tasks/application/use-cases/get-task.use-case'
import { ListCustomerTasksUseCase } from '@/domain/tasks/application/use-cases/list-customer-tasks.use-case'
import { MoveTaskStatusUseCase } from '@/domain/tasks/application/use-cases/move-task-status.use-case'
import { AddChecklistItemUseCase } from '@/domain/tasks/application/use-cases/add-checklist-item.use-case'
import { ToggleChecklistItemUseCase } from '@/domain/tasks/application/use-cases/toggle-checklist-item.use-case'
import { DeleteChecklistItemUseCase } from '@/domain/tasks/application/use-cases/delete-checklist-item.use-case'
import { AttachTaskTagUseCase } from '@/domain/tasks/application/use-cases/attach-task-tag.use-case'
import { DetachTaskTagUseCase } from '@/domain/tasks/application/use-cases/detach-task-tag.use-case'
import { GetTaskActivityLogUseCase } from '@/domain/tasks/application/use-cases/get-task-activity-log.use-case'
import { IChecklistItemRepository } from '@/domain/tasks/application/repositories/i-checklist-item.repository'
import { ITaskTagRepository } from '@/domain/tasks/application/repositories/i-task-tag.repository'
import { TaskPresenter } from '@/infra/presenters/task.presenter'
import { TaskNotFoundError } from '@/domain/tasks/domain/exceptions/task-not-found.error'

class CreateTaskDto {
  @ApiProperty() title!: string
  @ApiPropertyOptional() description?: string
  @ApiPropertyOptional() sprintId?: string
  @ApiPropertyOptional() parentTaskId?: string
  @ApiPropertyOptional() status?: string
  @ApiPropertyOptional() assigneeUserId?: string
  @ApiPropertyOptional() startAt?: string
  @ApiPropertyOptional() endAt?: string
  @ApiPropertyOptional() estimatedHours?: number
  @ApiPropertyOptional() impact?: number
  @ApiPropertyOptional() confidence?: number
  @ApiPropertyOptional() effort?: number
}

class UpdateTaskDto {
  @ApiPropertyOptional() title?: string
  @ApiPropertyOptional() description?: string
  @ApiPropertyOptional() sprintId?: string | null
  @ApiPropertyOptional() assigneeUserId?: string | null
  @ApiPropertyOptional() startAt?: string | null
  @ApiPropertyOptional() endAt?: string | null
  @ApiPropertyOptional() estimatedHours?: number | null
  @ApiPropertyOptional() impact?: number | null
  @ApiPropertyOptional() confidence?: number | null
  @ApiPropertyOptional() effort?: number | null
}

class MoveTaskStatusDto {
  @ApiProperty() status!: string
}

class AddChecklistItemDto {
  @ApiProperty() text!: string
  @ApiPropertyOptional() position?: number
}

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('customers/:customerId/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class TasksController {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly updateTaskUseCase: UpdateTaskUseCase,
    private readonly deleteTaskUseCase: DeleteTaskUseCase,
    private readonly getTaskUseCase: GetTaskUseCase,
    private readonly listTasksUseCase: ListCustomerTasksUseCase,
    private readonly moveStatusUseCase: MoveTaskStatusUseCase,
    private readonly addChecklistUseCase: AddChecklistItemUseCase,
    private readonly toggleChecklistUseCase: ToggleChecklistItemUseCase,
    private readonly deleteChecklistUseCase: DeleteChecklistItemUseCase,
    private readonly attachTagUseCase: AttachTaskTagUseCase,
    private readonly detachTagUseCase: DetachTaskTagUseCase,
    private readonly getActivityLogUseCase: GetTaskActivityLogUseCase,
    private readonly checklistRepo: IChecklistItemRepository,
    private readonly tagRepo: ITaskTagRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({ status: 201 })
  async create(
    @Param('customerId') customerId: string,
    @Body() body: CreateTaskDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.createTaskUseCase.execute({
      customerId,
      title: body.title,
      description: body.description,
      sprintId: body.sprintId,
      parentTaskId: body.parentTaskId,
      status: body.status,
      ownerUserId: user.userId,
      assigneeUserId: body.assigneeUserId,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined,
      estimatedHours: body.estimatedHours,
      impact: body.impact,
      confidence: body.confidence,
      effort: body.effort,
    })
    return { taskId: result.value.taskId }
  }

  @Get()
  @ApiOperation({ summary: 'List tasks for a customer' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'sprintId', required: false })
  @ApiQuery({ name: 'assigneeUserId', required: false })
  @ApiQuery({ name: 'ideas', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200 })
  async list(
    @Param('customerId') customerId: string,
    @Query('status') status?: string,
    @Query('sprintId') sprintId?: string,
    @Query('assigneeUserId') assigneeUserId?: string,
    @Query('ideas') ideas?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.listTasksUseCase.execute({
      customerId,
      status,
      sprintId,
      assigneeUserId,
      ideasOnly: ideas === 'true',
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
    return {
      items: result.value.items.map(t => TaskPresenter.toHTTP(t)),
      total: result.value.total,
    }
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get task detail' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async get(@Param('customerId') customerId: string, @Param('taskId') taskId: string) {
    const result = await this.getTaskUseCase.execute({ taskId, customerId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
    const task = result.value.task
    const [checklist, tags, logResult] = await Promise.all([
      this.checklistRepo.findByTaskId(taskId),
      this.tagRepo.findTagsByTaskId(taskId),
      this.getActivityLogUseCase.execute({ taskId }),
    ])
    return { task: TaskPresenter.toHTTP(task, { checklist, tags, activityLog: logResult.value.logs }) }
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async update(
    @Param('customerId') customerId: string,
    @Param('taskId') taskId: string,
    @Body() body: UpdateTaskDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.updateTaskUseCase.execute({
      taskId, customerId, userId: user.userId,
      title: body.title,
      description: body.description,
      sprintId: body.sprintId,
      assigneeUserId: body.assigneeUserId,
      startAt: body.startAt ? new Date(body.startAt) : (body.startAt as null | undefined),
      endAt: body.endAt ? new Date(body.endAt) : (body.endAt as null | undefined),
      estimatedHours: body.estimatedHours,
      impact: body.impact,
      confidence: body.confidence,
      effort: body.effort,
    })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return { taskId: result.value.taskId }
  }

  @Patch(':taskId/status')
  @ApiOperation({ summary: 'Move task to a new status' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiBody({ type: MoveTaskStatusDto })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async moveStatus(
    @Param('customerId') customerId: string,
    @Param('taskId') taskId: string,
    @Body() body: MoveTaskStatusDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.moveStatusUseCase.execute({ taskId, customerId, userId: user.userId, status: body.status })
    if (result.isLeft()) {
      if (result.value instanceof TaskNotFoundError) throw new NotFoundException(result.value.message)
      throw new BadRequestException(result.value.message)
    }
    return { taskId: result.value.taskId }
  }

  @Delete(':taskId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a task (soft)' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  async delete(@Param('customerId') customerId: string, @Param('taskId') taskId: string) {
    const result = await this.deleteTaskUseCase.execute({ taskId, customerId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  // Checklist
  @Post(':taskId/checklist')
  @ApiOperation({ summary: 'Add checklist item' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiBody({ type: AddChecklistItemDto })
  @ApiResponse({ status: 201 })
  async addChecklistItem(
    @Param('customerId') customerId: string,
    @Param('taskId') taskId: string,
    @Body() body: AddChecklistItemDto,
  ) {
    const result = await this.addChecklistUseCase.execute({ taskId, customerId, text: body.text, position: body.position })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return { itemId: result.value.itemId }
  }

  @Patch(':taskId/checklist/:itemId/toggle')
  @ApiOperation({ summary: 'Toggle checklist item' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiParam({ name: 'itemId', type: String })
  @ApiResponse({ status: 200 })
  async toggleChecklistItem(
    @Param('customerId') customerId: string,
    @Param('taskId') taskId: string,
    @Param('itemId') itemId: string,
  ) {
    const result = await this.toggleChecklistUseCase.execute({ itemId, taskId, customerId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return result.value
  }

  @Delete(':taskId/checklist/:itemId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete checklist item' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiParam({ name: 'itemId', type: String })
  @ApiResponse({ status: 204 })
  async deleteChecklistItem(@Param('taskId') taskId: string, @Param('itemId') itemId: string) {
    await this.deleteChecklistUseCase.execute({ itemId })
  }

  // Tags
  @Post(':taskId/tags/:tagId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Attach tag to task' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiParam({ name: 'tagId', type: String })
  @ApiResponse({ status: 204 })
  async attachTag(
    @Param('customerId') customerId: string,
    @Param('taskId') taskId: string,
    @Param('tagId') tagId: string,
  ) {
    const result = await this.attachTagUseCase.execute({ taskId, tagId, customerId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  @Delete(':taskId/tags/:tagId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Detach tag from task' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiParam({ name: 'tagId', type: String })
  @ApiResponse({ status: 204 })
  async detachTag(@Param('taskId') taskId: string, @Param('tagId') tagId: string) {
    await this.detachTagUseCase.execute({ taskId, tagId })
  }
}
