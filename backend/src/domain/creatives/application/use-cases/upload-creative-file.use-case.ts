import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativeRepository } from '../repositories/i-creative.repository'
import { ICreativesFolderService } from '../services/i-creatives-folder.service'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { IStorageAdapter } from '@/domain/documents/application/services/i-storage.adapter'
import { CreativeNotFoundError } from '../../domain/exceptions/creative-not-found.error'

export interface UploadCreativeFileRequest {
  customerId: string
  creativeId: string
  fileName: string
  mimeType: string
  sizeBytes?: number
  buffer: Buffer
  uploadedByUserId: string
}

export interface UploadCreativeFileResponse {
  driveFileId: string
  driveViewUrl: string
  driveDownloadUrl: string
}

export type UploadCreativeFileResult = Either<Error, UploadCreativeFileResponse>

@Injectable()
export class UploadCreativeFileUseCase {
  constructor(
    private readonly creativeRepo: ICreativeRepository,
    private readonly customerRepo: ICustomerRepository,
    private readonly folderService: ICreativesFolderService,
    private readonly storage: IStorageAdapter,
  ) {}

  async execute(req: UploadCreativeFileRequest): Promise<UploadCreativeFileResult> {
    const creative = await this.creativeRepo.findById(req.creativeId)
    if (!creative || creative.customerId !== req.customerId || creative.isDeleted) {
      return left(new CreativeNotFoundError(req.creativeId))
    }

    const customer = await this.customerRepo.findById(req.customerId)
    if (!customer) {
      return left(new CreativeNotFoundError(req.customerId))
    }

    const folderId = await this.folderService.getOrCreateFolder(customer.name)

    const uploaded = await this.storage.uploadFile({
      folderId,
      fileName: req.fileName,
      mimeType: req.mimeType,
      buffer: req.buffer,
    })

    creative.attachDriveFile({
      driveFileId: uploaded.fileId,
      driveViewUrl: uploaded.viewUrl,
      driveDownloadUrl: uploaded.downloadUrl,
      mimeType: req.mimeType,
      sizeBytes: req.sizeBytes ? BigInt(req.sizeBytes) : null,
    })

    await this.creativeRepo.save(creative)

    return right({
      driveFileId: uploaded.fileId,
      driveViewUrl: uploaded.viewUrl,
      driveDownloadUrl: uploaded.downloadUrl,
    })
  }
}
