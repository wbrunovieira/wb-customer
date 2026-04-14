import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Request as ExpressRequest } from 'express'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CreateCustomerPortalUserUseCase } from '@/domain/customers/application/use-cases/create-customer-portal-user.use-case'
import { ListCustomerPortalUsersUseCase } from '@/domain/customers/application/use-cases/list-customer-portal-users.use-case'
import { RevokeCustomerPortalAccessUseCase } from '@/domain/customers/application/use-cases/revoke-customer-portal-access.use-case'
import { UpdateCustomerPortalUserUseCase } from '@/domain/customers/application/use-cases/update-customer-portal-user.use-case'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { CustomerUserNotFoundError } from '@/domain/customers/domain/exceptions/customer-user-not-found.error'
import { UserAlreadyExistsError } from '@/domain/auth/domain/exceptions/user-already-exists.error'

interface AuthenticatedRequest extends ExpressRequest {
  user: { userId: string; role: string }
}

class CreatePortalUserDto {
  @ApiProperty({ example: 'client@company.com' })
  email!: string

  @ApiProperty({ example: 'Temp@1234' })
  password!: string

  @ApiProperty({ example: 'João Silva' })
  name!: string

  @ApiPropertyOptional({ example: '+5511999999999' })
  phone?: string

  @ApiPropertyOptional({ example: 'master', enum: ['master', 'member'] })
  customerRole?: 'master' | 'member'
}

class UpdatePortalUserDto {
  @ApiPropertyOptional({ example: 'João Santos' })
  name?: string

  @ApiPropertyOptional({ example: '+5511888888888' })
  phone?: string

  @ApiPropertyOptional({ example: 'member', enum: ['master', 'member'] })
  customerRole?: 'master' | 'member'
}

@ApiTags('Customer Portal Users')
@ApiBearerAuth()
@Controller('customers/:customerId/portal-users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class CustomerPortalUsersController {
  constructor(
    private readonly createPortalUser: CreateCustomerPortalUserUseCase,
    private readonly listPortalUsers: ListCustomerPortalUsersUseCase,
    private readonly revokeAccess: RevokeCustomerPortalAccessUseCase,
    private readonly updatePortalUser: UpdateCustomerPortalUserUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a portal user for a customer (admin only)' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiBody({ type: CreatePortalUserDto })
  @ApiResponse({ status: 201, description: 'Portal user created' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async create(
    @Param('customerId') customerId: string,
    @Body() body: CreatePortalUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.createPortalUser.execute({
      customerId,
      email: body.email,
      password: body.password,
      name: body.name,
      phone: body.phone,
      customerRole: body.customerRole ?? 'master',
      createdByUserId: req.user.userId,
    })

    if (result.isLeft()) {
      const err = result.value
      if (err instanceof CustomerNotFoundError) throw new NotFoundException(err.message)
      if (err instanceof UserAlreadyExistsError) throw new ConflictException(err.message)
      throw new BadRequestException((err as Error).message)
    }
    return result.value
  }

  @Get()
  @ApiOperation({ summary: 'List portal users for a customer (admin only)' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiResponse({ status: 200, description: 'List of portal users' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async list(@Param('customerId') customerId: string) {
    const result = await this.listPortalUsers.execute(customerId)
    if (result.isLeft()) {
      throw new NotFoundException(result.value.message)
    }
    return result.value
  }

  @Patch(':customerUserId')
  @ApiOperation({ summary: 'Update a portal user name, phone or role (admin only)' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'customerUserId', type: String })
  @ApiBody({ type: UpdatePortalUserDto })
  @ApiResponse({ status: 200, description: 'Portal user updated' })
  @ApiResponse({ status: 404, description: 'Portal user not found' })
  async update(
    @Param('customerUserId') customerUserId: string,
    @Body() body: UpdatePortalUserDto,
  ) {
    const result = await this.updatePortalUser.execute({
      customerUserId,
      name: body.name,
      phone: body.phone,
      customerRole: body.customerRole,
    })
    if (result.isLeft()) {
      const err = result.value
      if (err instanceof CustomerUserNotFoundError) throw new NotFoundException(err.message)
      throw new BadRequestException((err as Error).message)
    }
    return {}
  }

  @Delete(':customerUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke portal access (admin only)' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'customerUserId', type: String })
  @ApiResponse({ status: 204, description: 'Access revoked' })
  @ApiResponse({ status: 404, description: 'Portal user not found' })
  async revoke(@Param('customerUserId') customerUserId: string) {
    const result = await this.revokeAccess.execute(customerUserId)
    if (result.isLeft()) {
      const err = result.value
      if (err instanceof CustomerUserNotFoundError) throw new NotFoundException(err.message)
      throw new BadRequestException((err as Error).message)
    }
  }
}
