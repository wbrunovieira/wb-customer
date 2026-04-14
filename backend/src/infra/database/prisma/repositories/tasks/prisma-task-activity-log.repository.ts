import { Injectable } from '@nestjs/common'
import { ITaskActivityLogRepository } from '@/domain/tasks/application/repositories/i-task-activity-log.repository'
import { TaskActivityLog } from '@/domain/tasks/enterprise/entities/task-activity-log'
import { PrismaService } from '../../prisma.service'
import { UniqueEntityID } from '@/core/unique-entity-id'

@Injectable()
export class PrismaTaskActivityLogRepository implements ITaskActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTaskId(taskId: string): Promise<TaskActivityLog[]> {
    const rows = await this.prisma.taskActivityLog.findMany({
      where: { taskId }, orderBy: { createdAt: 'asc' },
    })
    return rows.map(r => TaskActivityLog.restore({
      taskId: r.taskId, userId: r.userId, action: r.action, fromValue: r.fromValue, toValue: r.toValue, createdAt: r.createdAt,
    }, new UniqueEntityID(r.id)))
  }

  async save(log: TaskActivityLog): Promise<void> {
    await this.prisma.taskActivityLog.create({
      data: {
        id: log.id.value,
        taskId: log.taskId,
        userId: log.userId,
        action: log.action,
        fromValue: log.fromValue,
        toValue: log.toValue,
        createdAt: log.createdAt,
      },
    })
  }
}
