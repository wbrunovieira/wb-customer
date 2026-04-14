import { Module } from '@nestjs/common'
import { ActivitiesController } from '@/infra/controllers/activities.controller'
import { CreateActivityUseCase } from '@/domain/activities/application/use-cases/create-activity.use-case'
import { UpdateActivityUseCase } from '@/domain/activities/application/use-cases/update-activity.use-case'
import { GetActivityUseCase } from '@/domain/activities/application/use-cases/get-activity.use-case'
import { ListCustomerActivitiesUseCase } from '@/domain/activities/application/use-cases/list-customer-activities.use-case'
import { DeleteActivityUseCase } from '@/domain/activities/application/use-cases/delete-activity.use-case'

@Module({
  controllers: [ActivitiesController],
  providers: [
    CreateActivityUseCase,
    UpdateActivityUseCase,
    GetActivityUseCase,
    ListCustomerActivitiesUseCase,
    DeleteActivityUseCase,
  ],
})
export class ActivitiesModule {}
