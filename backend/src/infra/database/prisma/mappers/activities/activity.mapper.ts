import { Activity } from '@/domain/activities/enterprise/entities/activity'
import { UniqueEntityID } from '@/core/unique-entity-id'

type ActivityRaw = {
  id: string
  customerId: string
  contactId: string | null
  type: string
  status: string
  subject: string | null
  description: string | null
  scheduledAt: Date | null
  occurredAt: Date | null
  durationSecs: number | null
  audioUrl: string | null
  transcriptText: string | null
  externalId: string | null
  direction: string | null
  createdByUserId: string
  assignedToUserId: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class ActivityMapper {
  static toDomain(raw: ActivityRaw): Activity {
    return Activity.restore(
      {
        customerId: raw.customerId,
        contactId: raw.contactId,
        type: raw.type,
        status: raw.status,
        subject: raw.subject,
        description: raw.description,
        scheduledAt: raw.scheduledAt,
        occurredAt: raw.occurredAt,
        durationSecs: raw.durationSecs,
        audioUrl: raw.audioUrl,
        transcriptText: raw.transcriptText,
        externalId: raw.externalId,
        direction: raw.direction,
        createdByUserId: raw.createdByUserId,
        assignedToUserId: raw.assignedToUserId,
        deletedAt: raw.deletedAt,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(activity: Activity): ActivityRaw & { id: string } {
    return {
      id: activity.id.value,
      customerId: activity.customerId,
      contactId: activity.contactId ?? null,
      type: activity.type,
      status: activity.status,
      subject: activity.subject ?? null,
      description: activity.description ?? null,
      scheduledAt: activity.scheduledAt ?? null,
      occurredAt: activity.occurredAt ?? null,
      durationSecs: activity.durationSecs ?? null,
      audioUrl: activity.audioUrl ?? null,
      transcriptText: activity.transcriptText ?? null,
      externalId: activity.externalId ?? null,
      direction: activity.direction ?? null,
      createdByUserId: activity.createdByUserId,
      assignedToUserId: activity.assignedToUserId ?? null,
      deletedAt: activity.deletedAt ?? null,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    }
  }
}
