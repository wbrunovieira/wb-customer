import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface TaskCommentProps {
  taskId: string
  parentId: string | null
  authorUserId: string
  body: string | null
  audioUrl: string | null
  resolved: boolean
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  attachments?: CommentAttachmentData[]
  annotations?: ImageAnnotationData[]
  reactions?: CommentReactionData[]
  replies?: TaskComment[]
}

export interface CommentAttachmentData {
  id: string
  url: string
  name: string
  mimeType: string
  sizeBytes: number | null
}

export interface ImageAnnotationData {
  id: string
  imageUrl: string
  x: number
  y: number
  number: number
  text: string
}

export interface CommentReactionData {
  userId: string
  emoji: string
}

export class TaskComment extends Entity<TaskCommentProps> {
  get taskId() { return this.props.taskId }
  get parentId() { return this.props.parentId }
  get authorUserId() { return this.props.authorUserId }
  get body() { return this.props.body }
  get audioUrl() { return this.props.audioUrl }
  get resolved() { return this.props.resolved }
  get deletedAt() { return this.props.deletedAt }
  get createdAt() { return this.props.createdAt }
  get updatedAt() { return this.props.updatedAt }
  get attachments(): CommentAttachmentData[] { return this.props.attachments ?? [] }
  get annotations(): ImageAnnotationData[] { return this.props.annotations ?? [] }
  get reactions(): CommentReactionData[] { return this.props.reactions ?? [] }
  get replies(): TaskComment[] { return this.props.replies ?? [] }

  resolve() {
    this.props.resolved = true
    this.props.updatedAt = new Date()
  }

  softDelete() {
    this.props.deletedAt = new Date()
    this.props.updatedAt = new Date()
  }

  addAttachment(data: CommentAttachmentData): void {
    this.props.attachments = [...this.attachments, data]
    this.props.updatedAt = new Date()
  }

  addAnnotation(data: ImageAnnotationData): void {
    this.props.annotations = [...this.annotations, data]
    this.props.updatedAt = new Date()
  }

  addReaction(userId: string, emoji: string): void {
    const exists = this.reactions.some((r) => r.userId === userId && r.emoji === emoji)
    if (!exists) this.props.reactions = [...this.reactions, { userId, emoji }]
  }

  removeReaction(userId: string, emoji: string): void {
    this.props.reactions = this.reactions.filter((r) => !(r.userId === userId && r.emoji === emoji))
  }

  static create(props: Omit<TaskCommentProps, 'resolved' | 'deletedAt' | 'createdAt' | 'updatedAt'>): TaskComment {
    return new TaskComment({ ...props, resolved: false, deletedAt: null, createdAt: new Date(), updatedAt: new Date() })
  }

  static restore(props: TaskCommentProps, id: string): TaskComment {
    return new TaskComment(props, new UniqueEntityID(id))
  }
}
