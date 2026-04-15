import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { TranscriptorService } from '@/infra/services/meetings/transcriptor.service'

@Injectable()
export class GoToTranscriptionService {
  private readonly logger = new Logger(GoToTranscriptionService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly transcriptor: TranscriptorService,
  ) {}

  /**
   * Cron job: polls Transcriptor for GoTo activities with pending transcription jobs.
   */
  async run(): Promise<void> {
    const pending = await this.prisma.activity.findMany({
      where: {
        gotoTranscriptionJobId: { not: null },
        gotoTranscriptText: null,
        deletedAt: null,
      },
      select: { id: true, gotoTranscriptionJobId: true },
      take: 20,
    })

    if (pending.length === 0) return

    for (const activity of pending) {
      try {
        const { status, error } = await this.transcriptor.getStatus(
          activity.gotoTranscriptionJobId!,
        )

        if (status === 'done') {
          const { text } = await this.transcriptor.getResult(activity.gotoTranscriptionJobId!)
          await this.prisma.activity.update({
            where: { id: activity.id },
            data: { gotoTranscriptText: text, transcriptText: text },
          })
          this.logger.log(`GoTo transcription done for activity ${activity.id}`)
        } else if (status === 'failed') {
          this.logger.warn(
            `GoTo transcription failed for activity ${activity.id}: ${error}`,
          )
          // Clear job so it can be retried
          await this.prisma.activity.update({
            where: { id: activity.id },
            data: { gotoTranscriptionJobId: null },
          })
        }
      } catch (err) {
        this.logger.error(`GoTo transcription poll error for activity ${activity.id}: ${err}`)
      }
    }
  }
}
