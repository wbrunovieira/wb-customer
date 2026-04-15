import { describe, it, expect, beforeEach } from 'vitest'
import { UploadCommentAudioUseCase } from './upload-comment-audio.use-case'
import { FakeStorageAdapter } from '@/test/adapters/fake-storage.adapter'

let storage: FakeStorageAdapter
let sut: UploadCommentAudioUseCase

beforeEach(() => {
  storage = new FakeStorageAdapter()
  sut = new UploadCommentAudioUseCase(storage)
})

describe('UploadCommentAudioUseCase', () => {
  it('should upload audio buffer and return a public URL', async () => {
    const result = await sut.execute({
      buffer: Buffer.from('fake-audio-data'),
      mimeType: 'audio/webm',
      taskId: 't1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value.audioUrl).toContain('https://')
    expect(storage.uploaded).toHaveLength(1)
    expect(storage.uploaded[0].mimeType).toBe('audio/webm')
  })

  it('should fail for non-audio mime types', async () => {
    const result = await sut.execute({
      buffer: Buffer.from('not-audio'),
      mimeType: 'application/pdf',
      taskId: 't1',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) expect(result.value.message).toMatch(/tipo.*inválido/i)
  })

  it('should support ogg and mp4 audio variants', async () => {
    for (const mimeType of ['audio/ogg', 'audio/mp4', 'audio/mpeg']) {
      storage.uploaded = []
      const result = await sut.execute({ buffer: Buffer.from('x'), mimeType, taskId: 't1' })
      expect(result.isRight()).toBe(true)
    }
  })
})
