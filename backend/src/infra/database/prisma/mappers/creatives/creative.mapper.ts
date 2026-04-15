import { Creative as PrismaCreative } from '@prisma/client'
import { Creative, CreativeType, CreativeStatus, CampaignObjective } from '@/domain/creatives/enterprise/entities/creative'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class CreativeMapper {
  static toDomain(raw: PrismaCreative): Creative {
    return Creative.restore(
      {
        customerId: raw.customerId,
        title: raw.title,
        caption: raw.caption,
        textInCreative: raw.textInCreative,
        designDescription: raw.designDescription,
        type: raw.type as CreativeType,
        objective: raw.objective as CampaignObjective | null,
        status: raw.status as CreativeStatus,
        driveFileId: raw.driveFileId,
        driveViewUrl: raw.driveViewUrl,
        driveDownloadUrl: raw.driveDownloadUrl,
        thumbnailUrl: raw.thumbnailUrl,
        mimeType: raw.mimeType,
        sizeBytes: raw.sizeBytes,
        createdByUserId: raw.createdByUserId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        deletedAt: raw.deletedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(creative: Creative): PrismaCreative {
    return {
      id: creative.id.value,
      customerId: creative.customerId,
      title: creative.title,
      caption: creative.caption,
      textInCreative: creative.textInCreative,
      designDescription: creative.designDescription,
      type: creative.type as PrismaCreative['type'],
      objective: creative.objective as PrismaCreative['objective'],
      status: creative.status as PrismaCreative['status'],
      driveFileId: creative.driveFileId,
      driveViewUrl: creative.driveViewUrl,
      driveDownloadUrl: creative.driveDownloadUrl,
      thumbnailUrl: creative.thumbnailUrl,
      mimeType: creative.mimeType,
      sizeBytes: creative.sizeBytes,
      createdByUserId: creative.createdByUserId,
      createdAt: creative.createdAt,
      updatedAt: creative.updatedAt,
      deletedAt: creative.deletedAt,
    }
  }
}
