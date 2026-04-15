import { describe, it, expect, beforeEach } from 'vitest'
import { AddImageAnnotationUseCase } from './add-image-annotation.use-case'
import { InMemoryTaskCommentRepository } from '@/test/repositories/tasks/in-memory-task-comment.repository'
import { TaskComment } from '../../enterprise/entities/task-comment'

let commentRepo: InMemoryTaskCommentRepository
let sut: AddImageAnnotationUseCase

beforeEach(() => {
  commentRepo = new InMemoryTaskCommentRepository()
  sut = new AddImageAnnotationUseCase(commentRepo)
})

describe('AddImageAnnotationUseCase', () => {
  it('should add an annotation with auto-incremented number', async () => {
    const comment = TaskComment.create({ taskId: 't1', parentId: null, authorUserId: 'u1', body: null, audioUrl: null })
    commentRepo.items = [comment]

    const result = await sut.execute({
      commentId: comment.id.value,
      imageUrl: 'https://img.example.com/screen.png',
      x: 0.35,
      y: 0.72,
      text: 'Button is misaligned here',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.annotationId).toBeDefined()
      expect(result.value.number).toBe(1)
    }
    const updated = commentRepo.items[0]
    expect(updated.annotations).toHaveLength(1)
    expect(updated.annotations[0].number).toBe(1)
    expect(updated.annotations[0].x).toBe(0.35)
    expect(updated.annotations[0].text).toBe('Button is misaligned here')
  })

  it('should increment number for each subsequent annotation', async () => {
    const comment = TaskComment.create({ taskId: 't1', parentId: null, authorUserId: 'u1', body: null, audioUrl: null })
    commentRepo.items = [comment]

    await sut.execute({ commentId: comment.id.value, imageUrl: 'https://img/a.png', x: 0.1, y: 0.2, text: 'First' })
    await sut.execute({ commentId: comment.id.value, imageUrl: 'https://img/a.png', x: 0.5, y: 0.6, text: 'Second' })
    await sut.execute({ commentId: comment.id.value, imageUrl: 'https://img/a.png', x: 0.9, y: 0.1, text: 'Third' })

    const updated = commentRepo.items[0]
    expect(updated.annotations.map((a) => a.number)).toEqual([1, 2, 3])
  })

  it('should return left when comment does not exist', async () => {
    const result = await sut.execute({
      commentId: 'ghost',
      imageUrl: 'https://img/x.png',
      x: 0,
      y: 0,
      text: 'note',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) expect(result.value.message).toMatch(/comentário.*não encontrado/i)
  })
})
