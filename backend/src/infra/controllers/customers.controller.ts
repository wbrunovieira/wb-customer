import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common'
import { Request as ExpressRequest } from 'express'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CreateCustomerUseCase } from '@/domain/customers/application/use-cases/create-customer.use-case'
import { UpdateCustomerUseCase } from '@/domain/customers/application/use-cases/update-customer.use-case'
import { GetCustomerUseCase } from '@/domain/customers/application/use-cases/get-customer.use-case'
import { ListCustomersUseCase } from '@/domain/customers/application/use-cases/list-customers.use-case'
import { DeleteCustomerUseCase } from '@/domain/customers/application/use-cases/delete-customer.use-case'
import { AssignEmployeeUseCase } from '@/domain/customers/application/use-cases/assign-employee.use-case'
import { RemoveEmployeeUseCase } from '@/domain/customers/application/use-cases/remove-employee.use-case'
import { ListCustomerActivitiesUseCase } from '@/domain/customers/application/use-cases/list-customer-activities.use-case'
import { CustomerAlreadyExistsError } from '@/domain/customers/domain/exceptions/customer-already-exists.error'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { CustomerCategoryNotFoundError } from '@/domain/customers/domain/exceptions/customer-category-not-found.error'
import { InvalidCustomerStatusError } from '@/domain/customers/domain/exceptions/invalid-customer-status.error'

interface AuthenticatedRequest extends ExpressRequest {
  user: { userId: string; role: string }
}

class CreateCustomerDto {
  name!: string
  email!: string
  phone?: string
  document?: string
  website?: string
  notes?: string
  categoryId?: string
}

class UpdateCustomerDto {
  name?: string
  email?: string
  phone?: string | null
  document?: string | null
  website?: string | null
  notes?: string | null
  status?: string
  categoryId?: string | null
}

class AssignEmployeeDto {
  userId!: string
}

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly updateCustomer: UpdateCustomerUseCase,
    private readonly getCustomer: GetCustomerUseCase,
    private readonly listCustomers: ListCustomersUseCase,
    private readonly deleteCustomer: DeleteCustomerUseCase,
    private readonly assignEmployee: AssignEmployeeUseCase,
    private readonly removeEmployee: RemoveEmployeeUseCase,
    private readonly listActivities: ListCustomerActivitiesUseCase,
  ) {}

  @Post()
  async create(
    @Body() body: CreateCustomerDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.createCustomer.execute({
      ...body,
      createdByUserId: req.user.userId,
    })

    if (result.isLeft()) {
      const error = result.value
      if (error instanceof CustomerAlreadyExistsError) throw new ConflictException(error.message)
      if (error instanceof CustomerCategoryNotFoundError) throw new BadRequestException(error.message)
      throw new BadRequestException()
    }

    return { customerId: result.value.customerId }
  }

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('employeeId') employeeId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.listCustomers.execute({
      status,
      search,
      employeeId,
      categoryId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
    const { items, total } = result.value
    return {
      items: items.map((c) => ({
        id: c.id.value,
        name: c.name,
        email: c.email,
        phone: c.phone,
        status: c.status.value,
        categoryId: c.categoryId,
        createdAt: c.createdAt,
      })),
      total,
    }
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const result = await this.getCustomer.execute({ customerId: id })

    if (result.isLeft()) throw new NotFoundException(result.value.message)

    const { customer, contacts, employees } = result.value
    return {
      id: customer.id.value,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      document: customer.document,
      website: customer.website,
      notes: customer.notes,
      status: customer.status.value,
      categoryId: customer.categoryId,
      driveFolderId: customer.driveFolderId,
      createdByUserId: customer.createdByUserId,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      contacts: contacts.map((c) => ({
        id: c.id.value,
        name: c.name,
        email: c.email,
        phone: c.phone,
        role: c.role,
        isPrimary: c.isPrimary,
      })),
      employees,
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCustomerDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.updateCustomer.execute({
      customerId: id,
      updatedByUserId: req.user.userId,
      ...body,
    })

    if (result.isLeft()) {
      const error = result.value
      if (error instanceof CustomerNotFoundError) throw new NotFoundException(error.message)
      if (error instanceof CustomerAlreadyExistsError) throw new ConflictException(error.message)
      if (error instanceof CustomerCategoryNotFoundError) throw new BadRequestException(error.message)
      if (error instanceof InvalidCustomerStatusError) throw new BadRequestException(error.message)
      throw new BadRequestException()
    }
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.deleteCustomer.execute({
      customerId: id,
      deletedByUserId: req.user.userId,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  @Post(':id/employees')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async assign(
    @Param('id') id: string,
    @Body() body: AssignEmployeeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.assignEmployee.execute({
      customerId: id,
      userId: body.userId,
      assignedBy: req.user.userId,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  @Delete(':id/employees/:userId')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEmp(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.removeEmployee.execute({
      customerId: id,
      userId,
      removedBy: req.user.userId,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  @Get(':id/activities')
  async getActivities(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.listActivities.execute({
      customerId: id,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)

    const { items, total } = result.value
    return {
      items: items.map((a) => ({
        id: a.id.value,
        type: a.type,
        description: a.description,
        userId: a.userId,
        metadata: a.metadata,
        createdAt: a.createdAt,
      })),
      total,
    }
  }
}
