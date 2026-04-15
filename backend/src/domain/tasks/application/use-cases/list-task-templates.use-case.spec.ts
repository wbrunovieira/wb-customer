import { describe, it, expect, beforeEach } from 'vitest'
import { ListTaskTemplatesUseCase } from './list-task-templates.use-case'
import { InMemoryTaskTemplateRepository } from '@/test/repositories/tasks/in-memory-task-template.repository'
import { TaskTemplate } from '../../enterprise/entities/task-template'

let repo: InMemoryTaskTemplateRepository
let sut: ListTaskTemplatesUseCase

beforeEach(() => {
  repo = new InMemoryTaskTemplateRepository()
  sut = new ListTaskTemplatesUseCase(repo)
})

describe('ListTaskTemplatesUseCase', () => {
  it('should return empty list when no templates exist', async () => {
    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.templates).toHaveLength(0)
  })

  it('should return all persisted templates', async () => {
    repo.items = [
      TaskTemplate.create({ name: 'T1', description: null, tasks: [{ title: 'X' }] }),
      TaskTemplate.create({ name: 'T2', description: 'desc', tasks: [{ title: 'Y' }] }),
    ]

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.templates).toHaveLength(2)
    expect(result.value.templates.map((t) => t.name)).toContain('T1')
    expect(result.value.templates.map((t) => t.name)).toContain('T2')
  })
})
