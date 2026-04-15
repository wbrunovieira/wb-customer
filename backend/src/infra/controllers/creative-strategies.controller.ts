import {
  Controller,
  Post,
  Get,
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
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CurrentUser } from '@/infra/auth/decorators/current-user.decorator'
import { CreateCreativeStrategyUseCase } from '@/domain/creatives/application/use-cases/create-creative-strategy.use-case'
import { UpdateCreativeStrategyUseCase } from '@/domain/creatives/application/use-cases/update-creative-strategy.use-case'
import { DeleteCreativeStrategyUseCase } from '@/domain/creatives/application/use-cases/delete-creative-strategy.use-case'
import { ListCreativeStrategiesUseCase } from '@/domain/creatives/application/use-cases/list-creative-strategies.use-case'
import { CreativeStrategy } from '@/domain/creatives/enterprise/entities/creative-strategy'

// ── DTOs ─────────────────────────────────────────────────────────────────────

class CreateStrategyDto {
  @ApiProperty({ example: 'Exploração Abril' }) name!: string
  @ApiProperty({ enum: ['exploration', 'refinement'], description: 'exploration = fase A, refinement = fase B' }) phase!: string
  @ApiPropertyOptional({ enum: ['awareness', 'traffic', 'engagement', 'leads', 'sales', 'retargeting'] }) objective?: string
  @ApiPropertyOptional({ example: 500, description: 'Budget in BRL' }) budget?: number
  @ApiPropertyOptional({ example: 5 }) durationDays?: number
  @ApiPropertyOptional({ example: '2026-04-01' }) startAt?: string
  @ApiPropertyOptional({ description: 'Parent strategy ID (for phase B)' }) parentStrategyId?: string
  @ApiProperty({ type: [String], example: ['creative-id-1', 'creative-id-2'] }) creativeIds!: string[]
  @ApiPropertyOptional() notes?: string
}

class UpdateStrategyDto {
  @ApiPropertyOptional() name?: string
  @ApiPropertyOptional({ enum: ['awareness', 'traffic', 'engagement', 'leads', 'sales', 'retargeting'] }) objective?: string
  @ApiPropertyOptional() budget?: number | null
  @ApiPropertyOptional() durationDays?: number | null
  @ApiPropertyOptional() startAt?: string | null
  @ApiPropertyOptional() endAt?: string | null
  @ApiPropertyOptional({ description: 'ID of the winning creative' }) winnerId?: string
  @ApiPropertyOptional({ enum: ['active', 'completed', 'paused'] }) status?: string
  @ApiPropertyOptional() notes?: string | null
}

// ── Serializer ────────────────────────────────────────────────────────────────

function toHttp(s: CreativeStrategy) {
  return {
    id: s.id.value,
    customerId: s.customerId,
    name: s.name,
    phase: s.phase,
    status: s.status,
    objective: s.objective,
    budget: s.budget,
    durationDays: s.durationDays,
    startAt: s.startAt,
    endAt: s.endAt,
    winnerId: s.winnerId,
    parentStrategyId: s.parentStrategyId,
    notes: s.notes,
    items: s.items,
    createdByUserId: s.createdByUserId,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }
}

@ApiTags('Creative Strategies')
@ApiBearerAuth()
@Controller('customers/:customerId/creative-strategies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class CreativeStrategiesController {
  constructor(
    private readonly createStrategy: CreateCreativeStrategyUseCase,
    private readonly updateStrategy: UpdateCreativeStrategyUseCase,
    private readonly deleteStrategy: DeleteCreativeStrategyUseCase,
    private readonly listStrategies: ListCreativeStrategiesUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a creative strategy (phase A – exploration or B – refinement)' })
  @ApiParam({ name: 'customerId' })
  @ApiBody({ type: CreateStrategyDto })
  @ApiResponse({ status: 201, description: 'Strategy created' })
  @ApiResponse({ status: 400, description: 'Customer not found or invalid input' })
  async create(
    @Param('customerId') customerId: string,
    @Body() body: CreateStrategyDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.createStrategy.execute({
      customerId,
      name: body.name,
      phase: body.phase,
      objective: body.objective,
      budget: body.budget,
      durationDays: body.durationDays,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      parentStrategyId: body.parentStrategyId,
      creativeIds: body.creativeIds,
      notes: body.notes,
      createdByUserId: user.userId,
    })

    if (result.isLeft()) throw new BadRequestException(result.value.message)
    return { strategyId: result.value.strategyId }
  }

  @Get()
  @ApiOperation({ summary: 'List creative strategies for a customer' })
  @ApiParam({ name: 'customerId' })
  @ApiQuery({ name: 'phase', required: false, enum: ['exploration', 'refinement'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'completed', 'paused'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of strategies' })
  async list(
    @Param('customerId') customerId: string,
    @Query('phase') phase?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.listStrategies.execute({
      customerId,
      phase,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })

    if (result.isLeft()) throw new BadRequestException()
    return { items: result.value.items.map(toHttp), total: result.value.total }
  }

  @Patch(':strategyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a strategy — set winner, complete, change budget, etc.' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'strategyId' })
  @ApiBody({ type: UpdateStrategyDto })
  @ApiResponse({ status: 204, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  async update(
    @Param('customerId') customerId: string,
    @Param('strategyId') strategyId: string,
    @Body() body: UpdateStrategyDto,
  ) {
    const result = await this.updateStrategy.execute({
      customerId,
      strategyId,
      name: body.name,
      budget: body.budget,
      durationDays: body.durationDays,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined,
      winnerId: body.winnerId,
      status: body.status,
      notes: body.notes,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  @Delete(':strategyId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a strategy (admin only)' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'strategyId' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  async delete(
    @Param('customerId') customerId: string,
    @Param('strategyId') strategyId: string,
  ) {
    const result = await this.deleteStrategy.execute({ customerId, strategyId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }
}
