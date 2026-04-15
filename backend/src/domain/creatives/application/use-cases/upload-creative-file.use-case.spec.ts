import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UploadCreativeFileUseCase } from './upload-creative-file.use-case'
import { InMemoryCreativeRepository } from './_test/in-memory-creative.repository'
import { InMemoryCustomerRepository } from './_test/in-memory-customer.repository'
import { makeCustomer, makeCreative } from './_test/factories'

const mockFolderService = {
  getOrCreateFolder: vi.fn().mockResolvedValue('folder-123'),
}

const mockStorage = {
  uploadFile: vi.fn().mockResolvedValue({
    fileId: 'drive-file-1',
    viewUrl: 'https://drive.google.com/view',
    downloadUrl: 'https://drive.google.com/download',
  }),
}

let creativeRepo: InMemoryCreativeRepository
let customerRepo: InMemoryCustomerRepository
let sut: UploadCreativeFileUseCase

beforeEach(() => {
  vi.clearAllMocks()
  creativeRepo = new InMemoryCreativeRepository()
  customerRepo = new InMemoryCustomerRepository()
  sut = new UploadCreativeFileUseCase(
    creativeRepo,
    customerRepo,
    mockFolderService as never,
    mockStorage as never,
  )
})

describe('UploadCreativeFileUseCase', () => {
  it('should attach Drive file info to the creative', async () => {
    const customer = makeCustomer()
    await customerRepo.save(customer)
    const creative = makeCreative({ customerId: customer.id.value })
    await creativeRepo.save(creative)

    const result = await sut.execute({
      customerId: customer.id.value,
      creativeId: creative.id.value,
      fileName: 'anuncio.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 204800,
      buffer: Buffer.from('fake-image'),
      uploadedByUserId: 'user-1',
    })

    expect(result.isRight()).toBe(true)
    const updated = await creativeRepo.findById(creative.id.value)
    expect(updated?.driveFileId).toBe('drive-file-1')
    expect(updated?.driveViewUrl).toBe('https://drive.google.com/view')
    expect(updated?.mimeType).toBe('image/jpeg')
  })

  it('should call folderService.getOrCreateFolder with customer name', async () => {
    const customer = makeCustomer({ name: 'Acme Corp' })
    await customerRepo.save(customer)
    const creative = makeCreative({ customerId: customer.id.value })
    await creativeRepo.save(creative)

    await sut.execute({
      customerId: customer.id.value,
      creativeId: creative.id.value,
      fileName: 'anuncio.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('x'),
      uploadedByUserId: 'user-1',
    })

    expect(mockFolderService.getOrCreateFolder).toHaveBeenCalledWith('Acme Corp')
  })

  it('should call storageAdapter.uploadFile with the buffer and folderId', async () => {
    const customer = makeCustomer()
    await customerRepo.save(customer)
    const creative = makeCreative({ customerId: customer.id.value })
    await creativeRepo.save(creative)
    const buf = Buffer.from('image-content')

    await sut.execute({
      customerId: customer.id.value,
      creativeId: creative.id.value,
      fileName: 'img.png',
      mimeType: 'image/png',
      buffer: buf,
      uploadedByUserId: 'user-1',
    })

    expect(mockStorage.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ folderId: 'folder-123', buffer: buf, mimeType: 'image/png' }),
    )
  })

  it('should return error when creative does not exist', async () => {
    const customer = makeCustomer()
    await customerRepo.save(customer)

    const result = await sut.execute({
      customerId: customer.id.value,
      creativeId: 'ghost',
      fileName: 'img.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('x'),
      uploadedByUserId: 'user-1',
    })

    expect(result.isLeft()).toBe(true)
  })

  it('should return error when creative belongs to another customer', async () => {
    const customer = makeCustomer()
    await customerRepo.save(customer)
    const creative = makeCreative({ customerId: 'other-customer' })
    await creativeRepo.save(creative)

    const result = await sut.execute({
      customerId: customer.id.value,
      creativeId: creative.id.value,
      fileName: 'img.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('x'),
      uploadedByUserId: 'user-1',
    })

    expect(result.isLeft()).toBe(true)
  })
})
