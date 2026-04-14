import { Injectable } from '@nestjs/common'
import { ITaskCommentRepository } from '@/domain/tasks/application/repositories/i-task-comment.repository'
import { TaskComment, TaskCommentProps } from '@/domain/tasks/enterprise/entities/task-comment'
import { PrismaService } from '../../prisma.service'
import { UniqueEntityID } from '@/core/unique-entity-id'

type PrismaComment = {
  id: string
  taskId: string
  parentId: string | null
  authorUserId: string
  body: string | null
  audioUrl: string | null
  resolved: boolean
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  attachments?: { id: string; url: string; name: string; mimeType: string; sizeBytes: bigint | null }[]
  annotations?: { id: string; imageUrl: string; x: number; y: number; number: number; text: string }[]
  reactions?: { userId: string; emoji: string }[]
  replies?: PrismaComment[]
}

function toDomain(raw: PrismaComment): TaskComment {
  return TaskComment.restore(
    {
      taskId: raw.taskId,
      parentId: raw.parentId,
      authorUserId: raw.authorUserId,
      body: raw.body,
      audioUrl: raw.audioUrl,
      resolved: raw.resolved,
      deletedAt: raw.deletedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      attachments: raw.attachments?.map(a => ({ id: a.id, url: a.url, name: a.name, mimeType: a.mimeType, sizeBytes: a.sizeBytes ? Number(a.sizeBytes) : null })),
      annotations: raw.annotations?.map(a => ({ id: a.id, imageUrl: a.imageUrl, x: a.x, y: a.y, number: a.number, text: a.text })),
      reactions: raw.reactions?.map(r => ({ userId: r.userId, emoji: r.emoji })),
      replies: raw.replies?.filter(r => !r.deletedAt).map(toDomain),
    } as TaskCommentProps,
    raw.id,
  )
}

const INCLUDE = {
  attachments: true,
  annotations: true,
  reactions: true,
  replies: { include: { attachments: true, annotations: true, reactions: true }, where: { deletedAt: null } },
} as const

@Injectable()
export class PrismaTaskCommentRepository implements ITaskCommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TaskComment | null> {
    const raw = await this.prisma.taskComment.findUnique({ where: { id }, include: INCLUDE })
    return raw ? toDomain(raw as unknown as PrismaComment) : null
  }

  async findByTaskId(taskId: string): Promise<TaskComment[]> {
    const raw = await this.prisma.taskComment.findMany({
      where: { taskId, parentId: null, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: INCLUDE,
    })
    return raw.map(r => toDomain(r as unknown as PrismaComment))
  }

  async save(comment: TaskComment): Promise<void> {
    await this.prisma.taskComment.upsert({
      where: { id: comment.id.value },
      create: {
        id: comment.id.value,
        taskId: comment.taskId,
        parentId: comment.parentId,
        authorUserId: comment.authorUserId,
        body: comment.body,
        audioUrl: comment.audioUrl,
        resolved: comment.resolved,
        deletedAt: comment.deletedAt,
      },
      update: {
        body: comment.body,
        audioUrl: comment.audioUrl,
        resolved: comment.resolved,
        deletedAt: comment.deletedAt,
        updatedAt: new Date(),
      },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.taskComment.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async addReaction(commentId: string, userId: string, emoji: string): Promise<void> {
    await this.prisma.commentReaction.upsert({
      where: { commentId_userId_emoji: { commentId, userId, emoji } },
      create: { commentId, userId, emoji },
      update: {},
    })
  }

  async removeReaction(commentId: string, userId: string, emoji: string): Promise<void> {
    await this.prisma.commentReaction.deleteMany({ where: { commentId, userId, emoji } })
  }
}
