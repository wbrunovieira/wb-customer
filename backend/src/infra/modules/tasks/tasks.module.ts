import { Module } from '@nestjs/common'
import { TasksController } from '@/infra/controllers/tasks.controller'
import { SprintsController } from '@/infra/controllers/sprints.controller'
import { TaskTagsController } from '@/infra/controllers/task-tags.controller'
import { AllTasksController } from '@/infra/controllers/all-tasks.controller'
import { CreateTaskUseCase } from '@/domain/tasks/application/use-cases/create-task.use-case'
import { UpdateTaskUseCase } from '@/domain/tasks/application/use-cases/update-task.use-case'
import { DeleteTaskUseCase } from '@/domain/tasks/application/use-cases/delete-task.use-case'
import { GetTaskUseCase } from '@/domain/tasks/application/use-cases/get-task.use-case'
import { ListCustomerTasksUseCase } from '@/domain/tasks/application/use-cases/list-customer-tasks.use-case'
import { MoveTaskStatusUseCase } from '@/domain/tasks/application/use-cases/move-task-status.use-case'
import { AddChecklistItemUseCase } from '@/domain/tasks/application/use-cases/add-checklist-item.use-case'
import { ToggleChecklistItemUseCase } from '@/domain/tasks/application/use-cases/toggle-checklist-item.use-case'
import { DeleteChecklistItemUseCase } from '@/domain/tasks/application/use-cases/delete-checklist-item.use-case'
import { CreateTaskTagUseCase } from '@/domain/tasks/application/use-cases/create-task-tag.use-case'
import { ListTaskTagsUseCase } from '@/domain/tasks/application/use-cases/list-task-tags.use-case'
import { AttachTaskTagUseCase } from '@/domain/tasks/application/use-cases/attach-task-tag.use-case'
import { DetachTaskTagUseCase } from '@/domain/tasks/application/use-cases/detach-task-tag.use-case'
import { GetTaskActivityLogUseCase } from '@/domain/tasks/application/use-cases/get-task-activity-log.use-case'
import { CreateSprintUseCase } from '@/domain/tasks/application/use-cases/create-sprint.use-case'
import { UpdateSprintUseCase } from '@/domain/tasks/application/use-cases/update-sprint.use-case'
import { DeleteSprintUseCase } from '@/domain/tasks/application/use-cases/delete-sprint.use-case'
import { ListSprintsUseCase } from '@/domain/tasks/application/use-cases/list-sprints.use-case'
import { ListAllTasksUseCase } from '@/domain/tasks/application/use-cases/list-all-tasks.use-case'

@Module({
  controllers: [TasksController, SprintsController, TaskTagsController, AllTasksController],
  providers: [
    // Task use cases
    CreateTaskUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
    GetTaskUseCase,
    ListCustomerTasksUseCase,
    MoveTaskStatusUseCase,
    // Checklist
    AddChecklistItemUseCase,
    ToggleChecklistItemUseCase,
    DeleteChecklistItemUseCase,
    // Tags
    CreateTaskTagUseCase,
    ListTaskTagsUseCase,
    AttachTaskTagUseCase,
    DetachTaskTagUseCase,
    // Activity log
    GetTaskActivityLogUseCase,
    // Sprint
    CreateSprintUseCase,
    UpdateSprintUseCase,
    DeleteSprintUseCase,
    ListSprintsUseCase,
    ListAllTasksUseCase,
  ],
})
export class TasksModule {}
