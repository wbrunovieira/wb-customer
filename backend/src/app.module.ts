import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { envSchema } from '@/env/env'
import { HealthController } from '@/infra/controllers/health.controller'
import { DatabaseModule } from '@/infra/database/database.module'
import { AuthModule } from '@/infra/modules/auth/auth.module'
import { CustomersModule } from '@/infra/modules/customers/customers.module'
import { DocumentsModule } from '@/infra/modules/documents/documents.module'
import { MeetingsModule } from '@/infra/modules/meetings/meetings.module'
import { PortalModule } from '@/infra/modules/portal/portal.module'
import { TasksModule } from '@/infra/modules/tasks/tasks.module'
import { NotificationsModule } from '@/infra/modules/notifications/notifications.module'
import { ActivitiesModule } from '@/infra/modules/activities/activities.module'
import { GoToModule } from '@/infra/modules/goto/goto.module'
import { WhatsAppModule } from '@/infra/modules/whatsapp/whatsapp.module'
import { GmailModule } from '@/infra/modules/gmail/gmail.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    CustomersModule,
    DocumentsModule,
    MeetingsModule,
    PortalModule,
    TasksModule,
    NotificationsModule,
    ActivitiesModule,
    GoToModule,
    WhatsAppModule,
    GmailModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
