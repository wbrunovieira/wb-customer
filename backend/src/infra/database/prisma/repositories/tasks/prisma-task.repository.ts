import { Injectable } from '@nestjs/common'
import { ITaskRepository, FindManyTasksParams, FindAllTasksParams, PaginatedTasks } from '@/domain/tasks/application/repositories/i-task.repository'
import { Task } from '@/domain/tasks/enterprise/entities/task'
import { PrismaService } from '../../prisma.service'
import { TaskMapper } from '../../mappers/tasks/task.mapper'
import { Prisma } from '@prisma/client'

@Injectable()
export class PrismaTaskRepository implements ITaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Task | null> {
    const raw = await this.prisma.task.findUnique({ where: { id } })
    return raw ? TaskMapper.toDomain(raw) : null
  }

  async findByCustomerId(customerId: string, params: FindManyTasksParams): Promise<PaginatedTasks> {
    const page = params.page ?? 1
    const limit = params.limit ?? 50

    const where: Prisma.TaskWhereInput = {
      customerId,
      deletedAt: null,
      ...(params.status ? { status: params.status as any } : {}),
      ...(params.sprintId !== undefined ? { sprintId: params.sprintId } : {}),
      ...(params.assigneeUserId ? { assigneeUserId: params.assigneeUserId } : {}),
      ...(params.parentTaskId !== undefined ? { parentTaskId: params.parentTaskId } : {}),
      ...(params.ideasOnly ? { status: { in: ['idea_could', 'idea_should'] as any } } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ boardPosition: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.task.count({ where }),
    ])

    return { items: items.map(TaskMapper.toDomain), total }
  }

  async findAll(params: FindAllTasksParams): Promise<PaginatedTasks> {
    const page = params.page ?? 1
    const limit = params.limit ?? 50

    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.status ? { status: params.status as any } : {}),
      ...(params.sprintId !== undefined ? { sprintId: params.sprintId } : {}),
      ...(params.assigneeUserId ? { assigneeUserId: params.assigneeUserId } : {}),
      ...(params.ideasOnly ? { status: { in: ['idea_could', 'idea_should'] as any } } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.task.count({ where }),
    ])

    return { items: items.map(TaskMapper.toDomain), total }
  }

  async save(task: Task): Promise<void> {
    const { id, ...data } = TaskMapper.toPrisma(task)
    await this.prisma.task.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } })
  }
}
