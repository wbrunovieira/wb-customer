import { Document as PrismaDocument } from '@prisma/client'
import { Document } from '@/domain/documents/enterprise/entities/document'
import { DocumentType } from '@/domain/documents/enterprise/value-objects/document-type.vo'
import { DocumentStatus } from '@/domain/documents/enterprise/value-objects/document-status.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class DocumentMapper {
  static toDomain(raw: PrismaDocument): Document {
    return Document.restore(
      {
        customerId: raw.customerId,
        type: DocumentType.createUnsafe(raw.type),
        title: raw.title,
        driveFileId: raw.driveFileId,
        driveViewUrl: raw.driveViewUrl,
        driveDownloadUrl: raw.driveDownloadUrl,
        mimeType: raw.mimeType,
        sizeBytes: raw.sizeBytes,
        signedAt: raw.signedAt,
        notes: raw.notes,
        status: DocumentStatus.createUnsafe(raw.status),
        uploadedByUserId: raw.uploadedByUserId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        deletedAt: raw.deletedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(doc: Document): PrismaDocument {
    return {
      id: doc.id.value,
      customerId: doc.customerId,
      type: doc.type.value as PrismaDocument['type'],
      title: doc.title,
      driveFileId: doc.driveFileId,
      driveViewUrl: doc.driveViewUrl,
      driveDownloadUrl: doc.driveDownloadUrl,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      signedAt: doc.signedAt,
      notes: doc.notes,
      status: doc.status.value as PrismaDocument['status'],
      uploadedByUserId: doc.uploadedByUserId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      deletedAt: doc.deletedAt,
    }
  }
}
