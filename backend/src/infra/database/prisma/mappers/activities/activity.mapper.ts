import { Activity, WhatsAppMessageData } from '@/domain/activities/enterprise/entities/activity'
import { UniqueEntityID } from '@/core/unique-entity-id'

type WhatsAppMessageRaw = {
  id: string
  remoteJid: string
  fromMe: boolean
  senderName: string | null
  text: string | null
  messageType: string
  mediaUrl: string | null
  mediaLabel: string | null
  mediaTranscriptText: string | null
  timestamp: Date
}

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
  // GoTo
  gotoCallId: string | null
  gotoCallOutcome: string | null
  gotoDuration: number | null
  gotoRecordingDriveId: string | null
  gotoRecordingUrl: string | null
  gotoRecordingUrl2: string | null
  gotoTranscriptionJobId: string | null
  gotoTranscriptText: string | null
  callContactType: string | null
  // Email
  emailMessageId: string | null
  emailThreadId: string | null
  emailSubject: string | null
  emailFromAddress: string | null
  emailFromName: string | null
  emailReplied: boolean
  whatsappMessages?: WhatsAppMessageRaw[]
}

export class ActivityMapper {
  static toDomain(raw: ActivityRaw): Activity {
    const whatsappMessages: WhatsAppMessageData[] | undefined = raw.whatsappMessages?.map((m) => ({
      id: m.id,
      remoteJid: m.remoteJid,
      fromMe: m.fromMe,
      senderName: m.senderName,
      text: m.text,
      messageType: m.messageType,
      mediaUrl: m.mediaUrl,
      mediaLabel: m.mediaLabel,
      mediaTranscriptText: m.mediaTranscriptText,
      timestamp: m.timestamp.toISOString(),
    }))
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
        gotoCallId: raw.gotoCallId,
        gotoCallOutcome: raw.gotoCallOutcome,
        gotoDuration: raw.gotoDuration,
        gotoRecordingDriveId: raw.gotoRecordingDriveId,
        gotoRecordingUrl: raw.gotoRecordingUrl,
        gotoRecordingUrl2: raw.gotoRecordingUrl2,
        gotoTranscriptionJobId: raw.gotoTranscriptionJobId,
        gotoTranscriptText: raw.gotoTranscriptText,
        callContactType: raw.callContactType,
        emailMessageId: raw.emailMessageId,
        emailThreadId: raw.emailThreadId,
        emailSubject: raw.emailSubject,
        emailFromAddress: raw.emailFromAddress,
        emailFromName: raw.emailFromName,
        emailReplied: raw.emailReplied,
        whatsappMessages,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(activity: Activity): Omit<ActivityRaw, 'whatsappMessages'> & { id: string } {
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
      gotoCallId: activity.gotoCallId ?? null,
      gotoCallOutcome: activity.gotoCallOutcome ?? null,
      gotoDuration: activity.gotoDuration ?? null,
      gotoRecordingDriveId: activity.gotoRecordingDriveId ?? null,
      gotoRecordingUrl: activity.gotoRecordingUrl ?? null,
      gotoRecordingUrl2: activity.gotoRecordingUrl2 ?? null,
      gotoTranscriptionJobId: activity.gotoTranscriptionJobId ?? null,
      gotoTranscriptText: activity.gotoTranscriptText ?? null,
      callContactType: activity.callContactType ?? null,
      emailMessageId: activity.emailMessageId ?? null,
      emailThreadId: activity.emailThreadId ?? null,
      emailSubject: activity.emailSubject ?? null,
      emailFromAddress: activity.emailFromAddress ?? null,
      emailFromName: activity.emailFromName ?? null,
      emailReplied: activity.emailReplied,
    }
  }
}
