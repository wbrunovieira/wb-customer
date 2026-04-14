import { Task as PrismaTask, ChecklistItem as PrismaChecklistItem, TaskTag as PrismaTaskTag } from '@prisma/client'
import { Task } from '@/domain/tasks/enterprise/entities/task'
import { ChecklistItem } from '@/domain/tasks/enterprise/entities/checklist-item'
import { TaskTag } from '@/domain/tasks/enterprise/entities/task-tag'
import { TaskStatus } from '@/domain/tasks/enterprise/value-objects/task-status.vo'
import { RecurrenceType } from '@/domain/tasks/enterprise/value-objects/recurrence-type.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class TaskMapper {
  static toDomain(raw: PrismaTask): Task {
    return Task.restore({
      customerId: raw.customerId,
      sprintId: raw.sprintId,
      parentTaskId: raw.parentTaskId,
      title: raw.title,
      description: raw.description,
      status: TaskStatus.createUnsafe(raw.status),
      ownerUserId: raw.ownerUserId,
      assigneeUserId: raw.assigneeUserId,
      startAt: raw.startAt,
      endAt: raw.endAt,
      estimatedHours: raw.estimatedHours,
      trackedSeconds: raw.trackedSeconds,
      impact: raw.impact,
      confidence: raw.confidence,
      effort: raw.effort,
      recurrenceType: RecurrenceType.createUnsafe(raw.recurrenceType),
      recurrenceRule: raw.recurrenceRule,
      progress: raw.progress,
      boardPosition: raw.boardPosition,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    }, new UniqueEntityID(raw.id))
  }

  static toPrisma(task: Task) {
    return {
      id: task.id.value,
      customerId: task.customerId,
      sprintId: task.sprintId,
      parentTaskId: task.parentTaskId,
      title: task.title,
      description: task.description,
      status: task.status.value as any,
      ownerUserId: task.ownerUserId,
      assigneeUserId: task.assigneeUserId,
      startAt: task.startAt,
      endAt: task.endAt,
      estimatedHours: task.estimatedHours,
      trackedSeconds: task.trackedSeconds,
      impact: task.impact,
      confidence: task.confidence,
      effort: task.effort,
      recurrenceType: task.recurrenceType.value as any,
      recurrenceRule: task.recurrenceRule as any,
      progress: task.progress,
      boardPosition: task.boardPosition,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      deletedAt: task.deletedAt,
    }
  }
}

export class ChecklistItemMapper {
  static toDomain(raw: PrismaChecklistItem): ChecklistItem {
    return ChecklistItem.restore({
      taskId: raw.taskId,
      text: raw.text,
      isDone: raw.isDone,
      position: raw.position,
      createdAt: raw.createdAt,
    }, new UniqueEntityID(raw.id))
  }

  static toPrisma(item: ChecklistItem) {
    return {
      id: item.id.value,
      taskId: item.taskId,
      text: item.text,
      isDone: item.isDone,
      position: item.position,
      createdAt: item.createdAt,
    }
  }
}

export class TaskTagMapper {
  static toDomain(raw: PrismaTaskTag): TaskTag {
    return TaskTag.restore({
      customerId: raw.customerId,
      name: raw.name,
      color: raw.color,
      createdAt: raw.createdAt,
    }, new UniqueEntityID(raw.id))
  }

  static toPrisma(tag: TaskTag) {
    return {
      id: tag.id.value,
      customerId: tag.customerId,
      name: tag.name,
      color: tag.color,
      createdAt: tag.createdAt,
    }
  }
}
