import { Global, Module } from '@nestjs/common'
import { NotificationsService } from '@/infra/notifications/notifications.service'
import { TaskNotificationsSubscriber } from '@/infra/notifications/task-notifications.subscriber'
import { EventsController } from '@/infra/controllers/events.controller'

@Global()
@Module({
  controllers: [EventsController],
  providers: [NotificationsService, TaskNotificationsSubscriber],
  exports: [NotificationsService],
})
export class NotificationsModule {}
