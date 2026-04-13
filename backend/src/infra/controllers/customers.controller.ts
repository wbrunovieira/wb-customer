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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
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
  @ApiProperty({ example: 'Acme Corp' })
  name!: string

  @ApiProperty({ example: 'contact@acme.com' })
  email!: string

  @ApiPropertyOptional({ example: '+5511999999999' })
  phone?: string

  @ApiPropertyOptional({ example: '12.345.678/0001-99', description: 'CNPJ' })
  document?: string

  @ApiPropertyOptional({ example: 'https://acme.com' })
  website?: string

  @ApiPropertyOptional({ example: 'Important enterprise client' })
  notes?: string

  @ApiPropertyOptional({ example: 'uuid', description: 'Category ID' })
  categoryId?: string
}

class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Acme Corp' })
  name?: string

  @ApiPropertyOptional({ example: 'contact@acme.com' })
  email?: string

  @ApiPropertyOptional({ example: '+5511999999999', nullable: true })
  phone?: string | null

  @ApiPropertyOptional({ example: '12.345.678/0001-99', nullable: true })
  document?: string | null

  @ApiPropertyOptional({ example: 'https://acme.com', nullable: true })
  website?: string | null

  @ApiPropertyOptional({ example: 'Notes here', nullable: true })
  notes?: string | null

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive', 'prospect', 'churned'] })
  status?: string

  @ApiPropertyOptional({ example: 'uuid', nullable: true, description: 'Category ID' })
  categoryId?: string | null
}

class AssignEmployeeDto {
  @ApiProperty({ example: 'uuid', description: 'User ID to assign' })
  userId!: string
}

@ApiTags('Customers')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: 201, description: 'Customer created', schema: { example: { customerId: 'uuid' } } })
  @ApiResponse({ status: 409, description: 'Customer email already exists' })
  @ApiResponse({ status: 400, description: 'Invalid data or category not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'List customers with optional filters' })
  @ApiQuery({ name: 'status', required: false, example: 'active', enum: ['active', 'inactive', 'prospect', 'churned'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or email' })
  @ApiQuery({ name: 'employeeId', required: false, description: 'Filter by assigned employee' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated list of customers' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer details with contacts and employees' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({ status: 204, description: 'Customer updated' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 409, description: 'Email already in use by another customer' })
  @ApiResponse({ status: 400, description: 'Invalid status or category not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Soft-delete a customer (admin only)' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 204, description: 'Customer deleted' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Assign an employee to a customer (admin/manager only)' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiBody({ type: AssignEmployeeDto })
  @ApiResponse({ status: 204, description: 'Employee assigned' })
  @ApiResponse({ status: 404, description: 'Customer or user not found' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Remove an employee from a customer (admin/manager only)' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: 204, description: 'Employee removed' })
  @ApiResponse({ status: 404, description: 'Customer or assignment not found' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'List activity log for a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated activity log' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
