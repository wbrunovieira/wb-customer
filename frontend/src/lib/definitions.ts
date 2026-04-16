import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido.' }),
  password: z.string().min(1, { message: 'Senha obrigatória.' }),
})

export type LoginFormState =
  | { errors?: { email?: string[]; password?: string[] }; message?: string }
  | undefined

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  userId: string
  role: string
  customerId?: string
  customerRole?: 'master' | 'member'
}

export type PortalUser = {
  customerUserId: string
  userId: string
  customerRole: 'master' | 'member'
  name: string
  phone: string | null
  createdAt: string
  deletedAt: string | null
}

export type CurrentUser = {
  id: string
  email: string
  name: string
  role: string
}

export type CustomerStatus = 'active' | 'inactive'

export type Customer = {
  id: string
  name: string
  email: string
  phone: string | null
  document: string | null
  website: string | null
  notes: string | null
  status: CustomerStatus
  categoryId: string | null
  driveFolderId: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

export type CustomerListItem = {
  id: string
  name: string
  email: string
  phone: string | null
  status: CustomerStatus
  categoryId: string | null
  createdAt: string
}

export type CustomerContact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  isPrimary: boolean
}

export type CustomerDetail = Customer & {
  contacts: CustomerContact[]
  employees: { userId: string; assignedAt: string; assignedBy: string }[]
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
}

export type DocumentType = 'proposal' | 'contract' | 'addendum' | 'other'
export type DocumentStatus = 'pending_signature' | 'signed' | 'expired' | 'cancelled'

export type Document = {
  id: string
  customerId: string
  type: DocumentType
  title: string
  driveFileId: string
  driveViewUrl: string
  driveDownloadUrl: string
  mimeType: string
  sizeBytes: number | null
  status: DocumentStatus
  notes: string | null
  signedAt: string | null
  uploadedByUserId: string
  createdAt: string
  updatedAt: string
}

export type DocumentFormState =
  | { errors?: { title?: string[]; type?: string[] }; message?: string }
  | undefined

export type CustomerFormState =
  | {
      errors?: {
        name?: string[]
        email?: string[]
        phone?: string[]
        document?: string[]
        website?: string[]
        notes?: string[]
      }
      message?: string
    }
  | undefined

// ─── Meetings ───────────────────────────────────────────────

export type MeetingStatus = 'scheduled' | 'ended' | 'cancelled'

export type MeetingAttendee = {
  email: string
  responseStatus: 'needsAction' | 'accepted' | 'declined' | 'tentative'
  organizer?: boolean
  self?: boolean
}

export type MeetingType = {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  color: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type Meeting = {
  id: string
  customerId: string
  contactId: string | null
  meetingTypeId: string | null
  title: string
  description: string | null
  startAt: string
  endAt: string | null
  actualStartAt: string | null
  actualEndAt: string | null
  googleEventId: string | null
  meetLink: string | null
  attendees: MeetingAttendee[]
  status: MeetingStatus
  scheduledByUserId: string
  recordingDriveId: string | null
  recordingUrl: string | null
  nativeTranscriptUrl: string | null
  transcriptText: string | null
  meetingSummary: string | null
  createdAt: string
  updatedAt: string
}

export type MeetingFormState =
  | { errors?: { title?: string[]; startAt?: string[]; endAt?: string[]; attendeeEmails?: string[] }; message?: string }
  | undefined

export type MeetingTypeFormState =
  | { errors?: { name?: string[]; durationMinutes?: string[] }; message?: string }
  | undefined

// ─── Tasks ───────────────────────────────────────────────────

export type TaskStatus =
  | 'idea_could'
  | 'idea_should'
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'done'
  | 'cancelled'

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'

export type TaskTag = {
  id: string
  name: string
  color: string
  customerId: string | null
}

export type ChecklistItem = {
  id: string
  taskId: string
  text: string
  isDone: boolean
  position: number
  createdAt: string
}

export type TaskActivityLog = {
  id: string
  taskId: string
  userId: string
  action: string
  fromValue: string | null
  toValue: string | null
  createdAt: string
}

export type CommentAttachment = {
  id: string
  url: string
  name: string
  mimeType: string
  sizeBytes: number | null
}

export type ImageAnnotation = {
  id: string
  imageUrl: string
  x: number
  y: number
  number: number
  text: string
}

export type CommentReaction = {
  userId: string
  emoji: string
}

export type TaskComment = {
  id: string
  taskId: string
  parentId: string | null
  authorUserId: string
  body: string | null
  audioUrl: string | null
  resolved: boolean
  createdAt: string
  updatedAt: string
  attachments: CommentAttachment[]
  annotations: ImageAnnotation[]
  reactions: CommentReaction[]
  replies: TaskComment[]
}

export type Task = {
  id: string
  customerId: string
  customerName?: string
  sprintId: string | null
  parentTaskId: string | null
  title: string
  description: string | null
  status: TaskStatus
  ownerUserId: string
  assigneeUserId: string | null
  startAt: string | null
  endAt: string | null
  estimatedHours: number | null
  trackedSeconds: number
  impact: number | null
  confidence: number | null
  effort: number | null
  iceScore: number | null
  recurrenceType: RecurrenceType
  progress: number
  boardPosition: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  // included when fetching detail
  checklist?: ChecklistItem[]
  tags?: TaskTag[]
  activityLog?: TaskActivityLog[]
  subtasks?: Task[]
}

export type Sprint = {
  id: string
  customerId: string
  name: string
  startAt: string
  endAt: string
  createdAt: string
  updatedAt: string
}

export type TemplateTaskData = {
  title: string
  description?: string | null
  estimatedHours?: number | null
  impact?: number | null
  confidence?: number | null
  effort?: number | null
}

export type TaskTemplate = {
  id: string
  name: string
  description: string | null
  tasks: TemplateTaskData[]
  createdAt: string
  updatedAt: string
}

// ─── Activities ──────────────────────────────────────────────

export type ActivityType = 'email' | 'whatsapp' | 'phone_call' | 'note' | 'meeting'
export type ActivityStatus = 'scheduled' | 'open' | 'done' | 'cancelled' | 'skipped'

export type Activity = {
  id: string
  customerId: string
  contactId: string | null
  type: ActivityType
  status: ActivityStatus
  subject: string | null
  description: string | null
  scheduledAt: string | null
  occurredAt: string | null
  durationSecs: number | null
  audioUrl: string | null
  transcriptText: string | null
  direction: string | null
  createdByUserId: string
  assignedToUserId: string | null
  createdAt: string
  updatedAt: string
  // GoTo Connect
  gotoCallOutcome: string | null
  gotoDuration: number | null
  gotoRecordingUrl: string | null
  gotoTranscriptText: string | null
  callContactType: string | null
  // Email
  emailMessageId: string | null
  emailThreadId: string | null
  emailSubject: string | null
  emailFromAddress: string | null
  emailFromName: string | null
  emailReplied: boolean
  // WhatsApp messages (nested when fetched with include)
  whatsappMessages?: WhatsAppMessage[]
}

export type WhatsAppMessage = {
  id: string
  remoteJid: string
  fromMe: boolean
  senderName: string | null
  text: string | null
  messageType: string
  mediaLabel: string | null
  mediaUrl: string | null
  mediaTranscriptText: string | null
  timestamp: string
}

// ─── Creatives ───────────────────────────────────────────────

export type CreativeType = 'image' | 'video' | 'carousel'
export type CreativeStatus = 'draft' | 'active' | 'paused' | 'archived'
export type CreativeStage = 'exploration' | 'refinement' | 'scale'
export type CampaignObjective = 'awareness' | 'traffic' | 'engagement' | 'leads' | 'sales' | 'retargeting'

export type Creative = {
  id: string
  customerId: string
  title: string
  caption: string | null
  textInCreative: string | null
  designDescription: string | null
  type: CreativeType
  stage: CreativeStage | null
  parentCreativeId: string | null
  variationAspects: string[]
  objective: CampaignObjective | null
  status: CreativeStatus
  driveFileId: string | null
  driveViewUrl: string | null
  driveDownloadUrl: string | null
  thumbnailUrl: string | null
  mimeType: string | null
  sizeBytes: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

export type CreativePerformance = {
  id: string
  creativeId: string
  platform: string
  campaignId: string | null
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr: number | null
  cpc: number | null
  cpa: number | null
  roas: number | null
  startDate: string
  endDate: string | null
  notes: string | null
  createdAt: string
}

export type StrategyPhase = 'exploration' | 'refinement'
export type StrategyStatus = 'active' | 'completed' | 'paused'

export type StrategyItem = {
  creativeId: string
  position: number
}

export type CreativeStrategy = {
  id: string
  customerId: string
  name: string
  phase: StrategyPhase
  status: StrategyStatus
  objective: CampaignObjective | null
  budget: number | null
  durationDays: number | null
  startAt: string | null
  endAt: string | null
  winnerId: string | null
  parentStrategyId: string | null
  notes: string | null
  items: StrategyItem[]
  createdByUserId: string
  createdAt: string
  updatedAt: string
}
