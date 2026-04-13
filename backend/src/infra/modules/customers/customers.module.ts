import { Module } from '@nestjs/common'
import { CustomerCategoriesController } from '@/infra/controllers/customer-categories.controller'
import { CustomersController } from '@/infra/controllers/customers.controller'
import { ContactsController } from '@/infra/controllers/contacts.controller'
import { CustomerPortalUsersController } from '@/infra/controllers/customer-portal-users.controller'
import { CreateCustomerPortalUserUseCase } from '@/domain/customers/application/use-cases/create-customer-portal-user.use-case'
import { ListCustomerPortalUsersUseCase } from '@/domain/customers/application/use-cases/list-customer-portal-users.use-case'
import { RevokeCustomerPortalAccessUseCase } from '@/domain/customers/application/use-cases/revoke-customer-portal-access.use-case'
import { CreateCustomerCategoryUseCase } from '@/domain/customers/application/use-cases/create-customer-category.use-case'
import { ListCustomerCategoriesUseCase } from '@/domain/customers/application/use-cases/list-customer-categories.use-case'
import { UpdateCustomerCategoryUseCase } from '@/domain/customers/application/use-cases/update-customer-category.use-case'
import { DeleteCustomerCategoryUseCase } from '@/domain/customers/application/use-cases/delete-customer-category.use-case'
import { CreateCustomerUseCase } from '@/domain/customers/application/use-cases/create-customer.use-case'
import { UpdateCustomerUseCase } from '@/domain/customers/application/use-cases/update-customer.use-case'
import { GetCustomerUseCase } from '@/domain/customers/application/use-cases/get-customer.use-case'
import { ListCustomersUseCase } from '@/domain/customers/application/use-cases/list-customers.use-case'
import { DeleteCustomerUseCase } from '@/domain/customers/application/use-cases/delete-customer.use-case'
import { AssignEmployeeUseCase } from '@/domain/customers/application/use-cases/assign-employee.use-case'
import { RemoveEmployeeUseCase } from '@/domain/customers/application/use-cases/remove-employee.use-case'
import { AddContactUseCase } from '@/domain/customers/application/use-cases/add-contact.use-case'
import { UpdateContactUseCase } from '@/domain/customers/application/use-cases/update-contact.use-case'
import { DeleteContactUseCase } from '@/domain/customers/application/use-cases/delete-contact.use-case'
import { ListCustomerActivitiesUseCase } from '@/domain/customers/application/use-cases/list-customer-activities.use-case'

@Module({
  controllers: [
    CustomerCategoriesController,
    CustomersController,
    ContactsController,
    CustomerPortalUsersController,
  ],
  providers: [
    // Category use-cases
    CreateCustomerCategoryUseCase,
    ListCustomerCategoriesUseCase,
    UpdateCustomerCategoryUseCase,
    DeleteCustomerCategoryUseCase,
    // Customer use-cases
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    GetCustomerUseCase,
    ListCustomersUseCase,
    DeleteCustomerUseCase,
    AssignEmployeeUseCase,
    RemoveEmployeeUseCase,
    // Contact use-cases
    AddContactUseCase,
    UpdateContactUseCase,
    DeleteContactUseCase,
    ListCustomerActivitiesUseCase,
    // Portal user use-cases (admin)
    CreateCustomerPortalUserUseCase,
    ListCustomerPortalUsersUseCase,
    RevokeCustomerPortalAccessUseCase,
  ],
})
export class CustomersModule {}
