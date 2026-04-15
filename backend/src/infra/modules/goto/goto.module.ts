import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MeetingsModule } from '@/infra/modules/meetings/meetings.module'
import { GoToController } from '@/infra/controllers/goto.controller'
import { GoToTokenService } from '@/infra/services/goto/goto-token.service'
import { GoToApiClient } from '@/infra/services/goto/goto-api.client'
import { GoToPhoneMatcherService } from '@/infra/services/goto/goto-phone-matcher.service'
import { GoToWebhookService } from '@/infra/services/goto/goto-webhook.service'
import { GoToRecordingService } from '@/infra/services/goto/goto-recording.service'
import { GoToTranscriptionService } from '@/infra/services/goto/goto-transcription.service'

@Module({
  imports: [ConfigModule, MeetingsModule],
  controllers: [GoToController],
  providers: [
    GoToTokenService,
    GoToApiClient,
    GoToPhoneMatcherService,
    GoToWebhookService,
    GoToRecordingService,
    GoToTranscriptionService,
  ],
  exports: [GoToTokenService, GoToPhoneMatcherService],
})
export class GoToModule {}
