import { Injectable } from '@nestjs/common'
import { ITaskTagRepository } from '@/domain/tasks/application/repositories/i-task-tag.repository'
import { TaskTag } from '@/domain/tasks/enterprise/entities/task-tag'
import { PrismaService } from '../../prisma.service'
import { TaskTagMapper } from '../../mappers/tasks/task.mapper'

@Injectable()
export class PrismaTaskTagRepository implements ITaskTagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TaskTag | null> {
    const raw = await this.prisma.taskTag.findUnique({ where: { id } })
    return raw ? TaskTagMapper.toDomain(raw) : null
  }

  async findByCustomerId(customerId: string | null): Promise<TaskTag[]> {
    const rows = await this.prisma.taskTag.findMany({
      where: { OR: [{ customerId }, { customerId: null }] },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(TaskTagMapper.toDomain)
  }

  async save(tag: TaskTag): Promise<void> {
    const { id, ...data } = TaskTagMapper.toPrisma(tag)
    await this.prisma.taskTag.upsert({ where: { id }, create: { id, ...data }, update: data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.taskTag.delete({ where: { id } })
  }

  async attachToTask(taskId: string, tagId: string): Promise<void> {
    await this.prisma.taskTagLink.upsert({
      where: { taskId_tagId: { taskId, tagId } },
      create: { taskId, tagId },
      update: {},
    })
  }

  async detachFromTask(taskId: string, tagId: string): Promise<void> {
    await this.prisma.taskTagLink.deleteMany({ where: { taskId, tagId } })
  }

  async findTagsByTaskId(taskId: string): Promise<TaskTag[]> {
    const links = await this.prisma.taskTagLink.findMany({
      where: { taskId },
      include: { tag: true },
    })
    return links.map(l => TaskTagMapper.toDomain(l.tag))
  }
}
