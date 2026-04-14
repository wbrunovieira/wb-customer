import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ProcessRecurringTasksUseCase } from '@/domain/tasks/application/use-cases/process-recurring-tasks.use-case'

@Injectable()
export class RecurringTasksScheduler {
  private readonly logger = new Logger(RecurringTasksScheduler.name)

  constructor(private readonly processRecurring: ProcessRecurringTasksUseCase) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Running recurring tasks cron...')
    await this.processRecurring.execute()
  }
}
