import { Task } from '@/domain/tasks/enterprise/entities/task'
import { ChecklistItem } from '@/domain/tasks/enterprise/entities/checklist-item'
import { TaskTag } from '@/domain/tasks/enterprise/entities/task-tag'
import { TaskActivityLog } from '@/domain/tasks/enterprise/entities/task-activity-log'
import { Sprint } from '@/domain/tasks/enterprise/entities/sprint'

export interface TaskHttpResponse {
  id: string
  customerId: string
  sprintId: string | null
  parentTaskId: string | null
  title: string
  description: string | null
  status: string
  ownerUserId: string
  assigneeUserId: string | null
  startAt: string | null
  endAt: string | null
  estimatedHours: number | null
  trackedSeconds: number
  impact: number | null
  confidence: number | null
  effort: number | null
  iceScore: number | null
  recurrenceType: string
  progress: number
  boardPosition: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  checklist?: ChecklistItemHttpResponse[]
  tags?: TagHttpResponse[]
  activityLog?: ActivityLogHttpResponse[]
  subtasks?: TaskHttpResponse[]
}

export interface ChecklistItemHttpResponse {
  id: string
  taskId: string
  text: string
  isDone: boolean
  position: number
  createdAt: string
}

export interface TagHttpResponse {
  id: string
  name: string
  color: string
}

export interface ActivityLogHttpResponse {
  id: string
  userId: string
  action: string
  fromValue: string | null
  toValue: string | null
  createdAt: string
}

export interface SprintHttpResponse {
  id: string
  customerId: string
  name: string
  startAt: string
  endAt: string
  createdAt: string
  updatedAt: string
}

export class TaskPresenter {
  static toHTTP(
    task: Task,
    opts?: { checklist?: ChecklistItem[]; tags?: TaskTag[]; activityLog?: TaskActivityLog[]; subtasks?: Task[] },
  ): TaskHttpResponse {
    return {
      id: task.id.value,
      customerId: task.customerId,
      sprintId: task.sprintId,
      parentTaskId: task.parentTaskId,
      title: task.title,
      description: task.description,
      status: task.status.value,
      ownerUserId: task.ownerUserId,
      assigneeUserId: task.assigneeUserId,
      startAt: task.startAt?.toISOString() ?? null,
      endAt: task.endAt?.toISOString() ?? null,
      estimatedHours: task.estimatedHours,
      trackedSeconds: task.trackedSeconds,
      impact: task.impact,
      confidence: task.confidence,
      effort: task.effort,
      iceScore: task.iceScore,
      recurrenceType: task.recurrenceType.value,
      progress: task.progress,
      boardPosition: task.boardPosition,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      deletedAt: task.deletedAt?.toISOString() ?? null,
      checklist: opts?.checklist?.map(i => ({
        id: i.id.value,
        taskId: i.taskId,
        text: i.text,
        isDone: i.isDone,
        position: i.position,
        createdAt: i.createdAt.toISOString(),
      })),
      tags: opts?.tags?.map(t => ({ id: t.id.value, name: t.name, color: t.color })),
      activityLog: opts?.activityLog?.map(l => ({
        id: l.id.value,
        userId: l.userId,
        action: l.action,
        fromValue: l.fromValue,
        toValue: l.toValue,
        createdAt: l.createdAt.toISOString(),
      })),
      subtasks: opts?.subtasks?.map(s => TaskPresenter.toHTTP(s)),
    }
  }
}

export class SprintPresenter {
  static toHTTP(sprint: Sprint): SprintHttpResponse {
    return {
      id: sprint.id.value,
      customerId: sprint.customerId,
      name: sprint.name,
      startAt: sprint.startAt.toISOString(),
      endAt: sprint.endAt.toISOString(),
      createdAt: sprint.createdAt.toISOString(),
      updatedAt: sprint.updatedAt.toISOString(),
    }
  }
}
