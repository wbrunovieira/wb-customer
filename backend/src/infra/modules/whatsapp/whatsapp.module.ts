import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MeetingsModule } from '@/infra/modules/meetings/meetings.module'
import { GoToModule } from '@/infra/modules/goto/goto.module'
import { EvolutionController } from '@/infra/controllers/evolution.controller'
import { EvolutionApiClient } from '@/infra/services/whatsapp/evolution-api.client'
import { WhatsAppWebhookService } from '@/infra/services/whatsapp/whatsapp-webhook.service'
import { WhatsAppMediaService } from '@/infra/services/whatsapp/whatsapp-media.service'

@Module({
  imports: [ConfigModule, MeetingsModule, GoToModule],
  controllers: [EvolutionController],
  providers: [
    EvolutionApiClient,
    WhatsAppWebhookService,
    WhatsAppMediaService,
  ],
})
export class WhatsAppModule {}
