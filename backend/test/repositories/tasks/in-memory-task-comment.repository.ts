import { ITaskCommentRepository } from '@/domain/tasks/application/repositories/i-task-comment.repository'
import { TaskComment, CommentAttachmentData, ImageAnnotationData } from '@/domain/tasks/enterprise/entities/task-comment'

export class InMemoryTaskCommentRepository implements ITaskCommentRepository {
  items: TaskComment[] = []

  async findById(id: string): Promise<TaskComment | null> {
    return this.items.find((c) => c.id.value === id) ?? null
  }

  async findByTaskId(taskId: string): Promise<TaskComment[]> {
    return this.items.filter((c) => c.taskId === taskId && !c.deletedAt)
  }

  async save(comment: TaskComment): Promise<void> {
    const idx = this.items.findIndex((c) => c.id.value === comment.id.value)
    if (idx >= 0) this.items[idx] = comment
    else this.items.push(comment)
  }

  async delete(id: string): Promise<void> {
    const comment = this.items.find((c) => c.id.value === id)
    comment?.softDelete()
  }

  async addReaction(commentId: string, userId: string, emoji: string): Promise<void> {
    const comment = this.items.find((c) => c.id.value === commentId)
    comment?.addReaction(userId, emoji)
  }

  async removeReaction(commentId: string, userId: string, emoji: string): Promise<void> {
    const comment = this.items.find((c) => c.id.value === commentId)
    comment?.removeReaction(userId, emoji)
  }

  async addAttachment(commentId: string, attachment: CommentAttachmentData): Promise<void> {
    const comment = this.items.find((c) => c.id.value === commentId)
    comment?.addAttachment(attachment)
  }

  async addAnnotation(commentId: string, annotation: ImageAnnotationData): Promise<void> {
    const comment = this.items.find((c) => c.id.value === commentId)
    comment?.addAnnotation(annotation)
  }

  async countAnnotations(commentId: string): Promise<number> {
    const comment = this.items.find((c) => c.id.value === commentId)
    return comment?.annotations.length ?? 0
  }
}
