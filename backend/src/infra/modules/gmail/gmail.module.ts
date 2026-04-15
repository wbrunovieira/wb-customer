import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GoToModule } from '@/infra/modules/goto/goto.module'
import { GmailController } from '@/infra/controllers/gmail.controller'
import { GmailService } from '@/infra/services/gmail/gmail.service'
import { GmailPollerService } from '@/infra/services/gmail/gmail-poller.service'

@Module({
  imports: [ConfigModule, GoToModule],
  controllers: [GmailController],
  providers: [GmailService, GmailPollerService],
})
export class GmailModule {}
