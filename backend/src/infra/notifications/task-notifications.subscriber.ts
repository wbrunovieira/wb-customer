import { Injectable, OnModuleInit } from '@nestjs/common'
import { DomainEvents } from '@/core/domain/events/domain-events'
import { TaskCreatedEvent } from '@/domain/tasks/enterprise/events/task-created.event'
import { TaskStatusChangedEvent } from '@/domain/tasks/enterprise/events/task-status-changed.event'
import { NotificationsService } from './notifications.service'

@Injectable()
export class TaskNotificationsSubscriber implements OnModuleInit {
  constructor(private readonly notifications: NotificationsService) {}

  onModuleInit(): void {
    DomainEvents.register(
      (event) => this.onTaskCreated(event as TaskCreatedEvent),
      TaskCreatedEvent.name,
    )

    DomainEvents.register(
      (event) => this.onTaskStatusChanged(event as TaskStatusChangedEvent),
      TaskStatusChangedEvent.name,
    )
  }

  private onTaskCreated(event: TaskCreatedEvent): void {
    this.notifications.push(event.ownerUserId, {
      type: 'task.created',
      title: 'Nova tarefa criada',
      body: event.title,
      meta: { taskId: event.taskId, customerId: event.customerId },
    })
  }

  private onTaskStatusChanged(event: TaskStatusChangedEvent): void {
    // Notify via a broadcast-to-all-logged-in-users approach would require
    // storing online users. For now, we store it by customerId context.
    // The controller stores the userId, so we skip push here as we don't
    // know the assignee from the event alone. This subscriber is a hook
    // for future enhancement when task entity carries assigneeUserId.
    void event
  }
}
