import { Module } from '@nestjs/common'
import { TasksController } from '@/infra/controllers/tasks.controller'
import { SprintsController } from '@/infra/controllers/sprints.controller'
import { TaskTagsController } from '@/infra/controllers/task-tags.controller'
import { AllTasksController } from '@/infra/controllers/all-tasks.controller'
import { CommentsController } from '@/infra/controllers/comments.controller'
import { TemplatesController } from '@/infra/controllers/templates.controller'
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
import { AddCommentUseCase } from '@/domain/tasks/application/use-cases/add-comment.use-case'
import { ListCommentsUseCase } from '@/domain/tasks/application/use-cases/list-comments.use-case'
import { ResolveCommentUseCase } from '@/domain/tasks/application/use-cases/resolve-comment.use-case'
import { ReactToCommentUseCase } from '@/domain/tasks/application/use-cases/react-to-comment.use-case'
import { DeleteCommentUseCase } from '@/domain/tasks/application/use-cases/delete-comment.use-case'
import { AddSubtaskUseCase } from '@/domain/tasks/application/use-cases/add-subtask.use-case'
import { CreateTaskTemplateUseCase } from '@/domain/tasks/application/use-cases/create-task-template.use-case'
import { ListTaskTemplatesUseCase } from '@/domain/tasks/application/use-cases/list-task-templates.use-case'
import { ApplyTaskTemplateUseCase } from '@/domain/tasks/application/use-cases/apply-task-template.use-case'
import { CreateTemplateFromTasksUseCase } from '@/domain/tasks/application/use-cases/create-template-from-tasks.use-case'
import { AddCommentAttachmentUseCase } from '@/domain/tasks/application/use-cases/add-comment-attachment.use-case'
import { AddImageAnnotationUseCase } from '@/domain/tasks/application/use-cases/add-image-annotation.use-case'
import { UploadCommentAudioUseCase } from '@/domain/tasks/application/use-cases/upload-comment-audio.use-case'
import { ReorderTasksUseCase } from '@/domain/tasks/application/use-cases/reorder-tasks.use-case'
import { StartTimeTrackingUseCase } from '@/domain/tasks/application/use-cases/start-time-tracking.use-case'
import { StopTimeTrackingUseCase } from '@/domain/tasks/application/use-cases/stop-time-tracking.use-case'
import { GetTaskTimeEntriesUseCase } from '@/domain/tasks/application/use-cases/get-task-time-entries.use-case'
import { ProcessRecurringTasksUseCase } from '@/domain/tasks/application/use-cases/process-recurring-tasks.use-case'
import { RecurringTasksScheduler } from '@/infra/tasks/recurring-tasks.scheduler'

@Module({
  controllers: [TasksController, SprintsController, TaskTagsController, AllTasksController, CommentsController, TemplatesController],
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
    // Comments
    AddCommentUseCase,
    ListCommentsUseCase,
    ResolveCommentUseCase,
    ReactToCommentUseCase,
    DeleteCommentUseCase,
    // Subtasks
    AddSubtaskUseCase,
    // Templates
    CreateTaskTemplateUseCase,
    ListTaskTemplatesUseCase,
    ApplyTaskTemplateUseCase,
    CreateTemplateFromTasksUseCase,
    // Comment attachments + annotations + audio
    AddCommentAttachmentUseCase,
    AddImageAnnotationUseCase,
    UploadCommentAudioUseCase,
    // Reorder + Time tracking
    ReorderTasksUseCase,
    StartTimeTrackingUseCase,
    StopTimeTrackingUseCase,
    GetTaskTimeEntriesUseCase,
    // Recurring tasks
    ProcessRecurringTasksUseCase,
    RecurringTasksScheduler,
  ],
})
export class TasksModule {}
