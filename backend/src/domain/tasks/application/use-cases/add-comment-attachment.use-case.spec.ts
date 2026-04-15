import { describe, it, expect, beforeEach } from 'vitest'
import { AddCommentAttachmentUseCase } from './add-comment-attachment.use-case'
import { InMemoryTaskCommentRepository } from '@/test/repositories/tasks/in-memory-task-comment.repository'
import { FakeStorageAdapter } from '@/test/adapters/fake-storage.adapter'
import { TaskComment } from '../../enterprise/entities/task-comment'

let commentRepo: InMemoryTaskCommentRepository
let storage: FakeStorageAdapter
let sut: AddCommentAttachmentUseCase

beforeEach(() => {
  commentRepo = new InMemoryTaskCommentRepository()
  storage = new FakeStorageAdapter()
  sut = new AddCommentAttachmentUseCase(commentRepo, storage)
})

describe('AddCommentAttachmentUseCase', () => {
  it('should upload file and attach to comment', async () => {
    const comment = TaskComment.create({ taskId: 't1', parentId: null, authorUserId: 'u1', body: 'hi', audioUrl: null })
    commentRepo.items = [comment]

    const result = await sut.execute({
      commentId: comment.id.value,
      buffer: Buffer.from('file content'),
      fileName: 'screenshot.png',
      mimeType: 'image/png',
      sizeBytes: 12,
    })

    expect(result.isRight()).toBe(true)
    expect(storage.uploaded).toHaveLength(1)
    expect(storage.uploaded[0].fileName).toBe('screenshot.png')
    const updated = commentRepo.items[0]
    expect(updated.attachments).toHaveLength(1)
    expect(updated.attachments[0].mimeType).toBe('image/png')
    expect(updated.attachments[0].url).toContain('screenshot')
  })

  it('should return left when comment does not exist', async () => {
    const result = await sut.execute({
      commentId: 'ghost',
      buffer: Buffer.from('x'),
      fileName: 'x.txt',
      mimeType: 'text/plain',
      sizeBytes: 1,
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) expect(result.value.message).toMatch(/comentário.*não encontrado/i)
  })

  it('should support audio and video mime types', async () => {
    const comment = TaskComment.create({ taskId: 't1', parentId: null, authorUserId: 'u1', body: null, audioUrl: null })
    commentRepo.items = [comment]

    await sut.execute({ commentId: comment.id.value, buffer: Buffer.from('audio'), fileName: 'rec.webm', mimeType: 'audio/webm', sizeBytes: 5 })
    await sut.execute({ commentId: comment.id.value, buffer: Buffer.from('video'), fileName: 'vid.mp4', mimeType: 'video/mp4', sizeBytes: 10 })

    expect(commentRepo.items[0].attachments).toHaveLength(2)
  })
})
