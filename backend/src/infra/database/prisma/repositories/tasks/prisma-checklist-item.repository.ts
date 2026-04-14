import { Injectable } from '@nestjs/common'
import { IChecklistItemRepository } from '@/domain/tasks/application/repositories/i-checklist-item.repository'
import { ChecklistItem } from '@/domain/tasks/enterprise/entities/checklist-item'
import { PrismaService } from '../../prisma.service'
import { ChecklistItemMapper } from '../../mappers/tasks/task.mapper'

@Injectable()
export class PrismaChecklistItemRepository implements IChecklistItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ChecklistItem | null> {
    const raw = await this.prisma.checklistItem.findUnique({ where: { id } })
    return raw ? ChecklistItemMapper.toDomain(raw) : null
  }

  async findByTaskId(taskId: string): Promise<ChecklistItem[]> {
    const rows = await this.prisma.checklistItem.findMany({
      where: { taskId }, orderBy: { position: 'asc' },
    })
    return rows.map(ChecklistItemMapper.toDomain)
  }

  async save(item: ChecklistItem): Promise<void> {
    const { id, ...data } = ChecklistItemMapper.toPrisma(item)
    await this.prisma.checklistItem.upsert({ where: { id }, create: { id, ...data }, update: data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.checklistItem.delete({ where: { id } })
  }
}
