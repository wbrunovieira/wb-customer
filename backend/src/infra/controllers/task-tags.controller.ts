import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody, ApiResponse, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CreateTaskTagUseCase } from '@/domain/tasks/application/use-cases/create-task-tag.use-case'
import { ListTaskTagsUseCase } from '@/domain/tasks/application/use-cases/list-task-tags.use-case'

class CreateTagDto {
  @ApiProperty() name!: string
  @ApiPropertyOptional() color?: string
  @ApiPropertyOptional() customerId?: string
}

@ApiTags('Task Tags')
@ApiBearerAuth()
@Controller('task-tags')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class TaskTagsController {
  constructor(
    private readonly createTag: CreateTaskTagUseCase,
    private readonly listTags: ListTaskTagsUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a tag' })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({ status: 201 })
  async create(@Body() body: CreateTagDto) {
    const result = await this.createTag.execute({ customerId: body.customerId, name: body.name, color: body.color })
    return { tagId: result.value.tagId }
  }

  @Get()
  @ApiOperation({ summary: 'List tags' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiResponse({ status: 200 })
  async list(@Query('customerId') customerId?: string) {
    const result = await this.listTags.execute({ customerId })
    return { tags: result.value.tags.map(t => ({ id: t.id.value, name: t.name, color: t.color, customerId: t.customerId })) }
  }
}
