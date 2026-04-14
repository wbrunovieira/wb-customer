import { Injectable } from '@nestjs/common'
import { ISprintRepository } from '@/domain/tasks/application/repositories/i-sprint.repository'
import { Sprint } from '@/domain/tasks/enterprise/entities/sprint'
import { PrismaService } from '../../prisma.service'
import { SprintMapper } from '../../mappers/tasks/sprint.mapper'

@Injectable()
export class PrismaSprintRepository implements ISprintRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Sprint | null> {
    const raw = await this.prisma.sprint.findUnique({ where: { id } })
    return raw ? SprintMapper.toDomain(raw) : null
  }

  async findByCustomerId(customerId: string): Promise<Sprint[]> {
    const rows = await this.prisma.sprint.findMany({
      where: { customerId },
      orderBy: { startAt: 'asc' },
    })
    return rows.map(SprintMapper.toDomain)
  }

  async save(sprint: Sprint): Promise<void> {
    const { id, ...data } = SprintMapper.toPrisma(sprint)
    await this.prisma.sprint.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.sprint.delete({ where: { id } })
  }
}
