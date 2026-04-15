import { Injectable } from '@nestjs/common'
import { ITaskTemplateRepository } from '@/domain/tasks/application/repositories/i-task-template.repository'
import { TaskTemplate } from '@/domain/tasks/enterprise/entities/task-template'
import { PrismaService } from '../../prisma.service'
import { TaskTemplateMapper } from '../../mappers/tasks/task-template.mapper'

@Injectable()
export class PrismaTaskTemplateRepository implements ITaskTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TaskTemplate | null> {
    const raw = await this.prisma.taskTemplate.findUnique({ where: { id } })
    return raw ? TaskTemplateMapper.toDomain(raw) : null
  }

  async findAll(): Promise<TaskTemplate[]> {
    const rows = await this.prisma.taskTemplate.findMany({ orderBy: { createdAt: 'desc' } })
    return rows.map(TaskTemplateMapper.toDomain)
  }

  async save(template: TaskTemplate): Promise<void> {
    const { id, ...data } = TaskTemplateMapper.toPrisma(template)
    await this.prisma.taskTemplate.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.taskTemplate.delete({ where: { id } })
  }
}
