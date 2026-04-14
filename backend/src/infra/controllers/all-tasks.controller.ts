import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { ListAllTasksUseCase } from '@/domain/tasks/application/use-cases/list-all-tasks.use-case'
import { TaskPresenter } from '@/infra/presenters/task.presenter'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class AllTasksController {
  constructor(
    private readonly listAllTasks: ListAllTasksUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all tasks across all customers' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'groupBy', required: false, description: 'customer' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200 })
  async list(
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.listAllTasks.execute({
      customerId: customerId || undefined,
      status: status || undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
    const { items, total } = result.value

    // Enrich with customer names in one query
    const customerIds = [...new Set(items.map((t) => t.customerId))]
    const customers = customerIds.length
      ? await this.prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : []
    const customerMap = new Map(customers.map((c) => [c.id, c.name]))

    return {
      items: items.map((t) => ({
        ...TaskPresenter.toHTTP(t),
        customerName: customerMap.get(t.customerId) ?? null,
      })),
      total,
    }
  }
}
