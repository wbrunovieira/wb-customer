import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, NotFoundException, BadRequestException, HttpCode,
} from '@nestjs/common'
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiParam,
  ApiBody, ApiResponse, ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CurrentUser } from '@/infra/auth/decorators/current-user.decorator'
import { CreateTaskTemplateUseCase } from '@/domain/tasks/application/use-cases/create-task-template.use-case'
import { ListTaskTemplatesUseCase } from '@/domain/tasks/application/use-cases/list-task-templates.use-case'
import { ApplyTaskTemplateUseCase } from '@/domain/tasks/application/use-cases/apply-task-template.use-case'
import { CreateTemplateFromTasksUseCase } from '@/domain/tasks/application/use-cases/create-template-from-tasks.use-case'
import { ITaskTemplateRepository } from '@/domain/tasks/application/repositories/i-task-template.repository'
import { TemplateTaskData } from '@/domain/tasks/enterprise/entities/task-template'

class TemplateTaskDto {
  @ApiProperty() title!: string
  @ApiPropertyOptional() description?: string
  @ApiPropertyOptional() status?: string
  @ApiPropertyOptional() estimatedHours?: number
  @ApiPropertyOptional() impact?: number
  @ApiPropertyOptional() confidence?: number
  @ApiPropertyOptional() effort?: number
}

class CreateTemplateDto {
  @ApiProperty() name!: string
  @ApiPropertyOptional() description?: string
  @ApiProperty({ type: [TemplateTaskDto] }) tasks!: TemplateTaskDto[]
}

class ApplyTemplateDto {
  @ApiPropertyOptional() sprintId?: string
}

class CreateFromTasksDto {
  @ApiProperty() name!: string
  @ApiPropertyOptional() description?: string
  @ApiProperty({ type: [String] }) taskIds!: string[]
}

function templateToHttp(t: { id: { value: string }; name: string; description: string | null; tasks: TemplateTaskData[]; createdAt: Date }) {
  return {
    id: t.id.value,
    name: t.name,
    description: t.description,
    tasks: t.tasks,
    createdAt: t.createdAt,
  }
}

@ApiTags('Task Templates')
@ApiBearerAuth()
@Controller('task-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class TemplatesController {
  constructor(
    private readonly createTemplate: CreateTaskTemplateUseCase,
    private readonly listTemplates: ListTaskTemplatesUseCase,
    private readonly applyTemplate: ApplyTaskTemplateUseCase,
    private readonly createFromTasks: CreateTemplateFromTasksUseCase,
    private readonly templateRepo: ITaskTemplateRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a task template' })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({ status: 201 })
  async create(@Body() body: CreateTemplateDto) {
    const result = await this.createTemplate.execute({
      name: body.name,
      description: body.description,
      tasks: body.tasks as TemplateTaskData[],
    })
    if (result.isLeft()) throw new BadRequestException(result.value.message)
    return { templateId: result.value.templateId }
  }

  @Get()
  @ApiOperation({ summary: 'List all task templates' })
  @ApiResponse({ status: 200 })
  async list() {
    const result = await this.listTemplates.execute()
    return { templates: result.value.templates.map(templateToHttp) }
  }

  @Post(':templateId/apply/:customerId')
  @ApiOperation({ summary: 'Apply a template to a customer (creates tasks)' })
  @ApiParam({ name: 'templateId', type: String })
  @ApiParam({ name: 'customerId', type: String })
  @ApiBody({ type: ApplyTemplateDto })
  @ApiResponse({ status: 201 })
  async apply(
    @Param('templateId') templateId: string,
    @Param('customerId') customerId: string,
    @Body() body: ApplyTemplateDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.applyTemplate.execute({
      templateId,
      customerId,
      ownerUserId: user.userId,
      sprintId: body.sprintId ?? null,
    })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return { taskIds: result.value.taskIds }
  }

  @Post('from-tasks')
  @ApiOperation({ summary: 'Create a template from existing tasks' })
  @ApiBody({ type: CreateFromTasksDto })
  @ApiResponse({ status: 201 })
  async fromTasks(@Body() body: CreateFromTasksDto) {
    const result = await this.createFromTasks.execute({
      name: body.name,
      description: body.description,
      taskIds: body.taskIds,
    })
    if (result.isLeft()) throw new BadRequestException(result.value.message)
    return { templateId: result.value.templateId }
  }

  @Delete(':templateId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a task template' })
  @ApiParam({ name: 'templateId', type: String })
  @ApiResponse({ status: 204 })
  async remove(@Param('templateId') templateId: string) {
    const tpl = await this.templateRepo.findById(templateId)
    if (!tpl) throw new NotFoundException('Template não encontrado')
    await this.templateRepo.delete(templateId)
  }
}
