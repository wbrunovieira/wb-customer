import { Module } from '@nestjs/common'
import { PortalController } from '@/infra/controllers/portal.controller'
import { ListPortalMeetingsUseCase } from '@/domain/customers/application/use-cases/list-portal-meetings.use-case'
import { GetPortalMeetingUseCase } from '@/domain/customers/application/use-cases/get-portal-meeting.use-case'
import { CreateCustomerSubUserUseCase } from '@/domain/customers/application/use-cases/create-customer-sub-user.use-case'
import { ListCustomerPortalUsersUseCase } from '@/domain/customers/application/use-cases/list-customer-portal-users.use-case'

@Module({
  controllers: [PortalController],
  providers: [
    ListPortalMeetingsUseCase,
    GetPortalMeetingUseCase,
    CreateCustomerSubUserUseCase,
    ListCustomerPortalUsersUseCase,
  ],
})
export class PortalModule {}
