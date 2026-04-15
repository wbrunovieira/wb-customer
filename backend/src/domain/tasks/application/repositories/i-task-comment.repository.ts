import { TaskComment, CommentAttachmentData, ImageAnnotationData } from '../../enterprise/entities/task-comment'

export abstract class ITaskCommentRepository {
  abstract findById(id: string): Promise<TaskComment | null>
  abstract findByTaskId(taskId: string): Promise<TaskComment[]>
  abstract save(comment: TaskComment): Promise<void>
  abstract delete(id: string): Promise<void>
  abstract addReaction(commentId: string, userId: string, emoji: string): Promise<void>
  abstract removeReaction(commentId: string, userId: string, emoji: string): Promise<void>
  abstract addAttachment(commentId: string, attachment: CommentAttachmentData): Promise<void>
  abstract addAnnotation(commentId: string, annotation: ImageAnnotationData): Promise<void>
  abstract countAnnotations(commentId: string): Promise<number>
}
