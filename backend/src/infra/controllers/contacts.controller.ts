import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Request as ExpressRequest } from 'express'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { AddContactUseCase } from '@/domain/customers/application/use-cases/add-contact.use-case'
import { UpdateContactUseCase } from '@/domain/customers/application/use-cases/update-contact.use-case'
import { DeleteContactUseCase } from '@/domain/customers/application/use-cases/delete-contact.use-case'
import { IContactRepository } from '@/domain/customers/application/repositories/i-contact.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { ContactNotFoundError } from '@/domain/customers/domain/exceptions/contact-not-found.error'

interface AuthenticatedRequest extends ExpressRequest {
  user: { userId: string; role: string }
}

class AddContactDto {
  @ApiProperty({ example: 'Jane Doe' })
  name!: string

  @ApiPropertyOptional({ example: 'jane@acme.com' })
  email?: string

  @ApiPropertyOptional({ example: '+5511988887777' })
  phone?: string

  @ApiPropertyOptional({ example: 'CTO', description: 'Contact role within the company' })
  role?: string

  @ApiPropertyOptional({ example: true, description: 'Mark as primary contact' })
  isPrimary?: boolean
}

class UpdateContactDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  name?: string

  @ApiPropertyOptional({ example: 'jane@acme.com', nullable: true })
  email?: string | null

  @ApiPropertyOptional({ example: '+5511988887777', nullable: true })
  phone?: string | null

  @ApiPropertyOptional({ example: 'CTO', nullable: true })
  role?: string | null

  @ApiPropertyOptional({ example: false })
  isPrimary?: boolean
}

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('customers/:customerId/contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
  constructor(
    private readonly addContact: AddContactUseCase,
    private readonly updateContact: UpdateContactUseCase,
    private readonly deleteContact: DeleteContactUseCase,
    private readonly contactRepo: IContactRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add a contact to a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiBody({ type: AddContactDto })
  @ApiResponse({ status: 201, description: 'Contact added', schema: { example: { contactId: 'uuid' } } })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Param('customerId') customerId: string,
    @Body() body: AddContactDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.addContact.execute({
      customerId,
      addedByUserId: req.user.userId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      role: body.role,
      isPrimary: body.isPrimary,
    })

    if (result.isLeft()) {
      throw new NotFoundException(result.value.message)
    }

    return { contactId: result.value.contactId }
  }

  @Get()
  @ApiOperation({ summary: 'List all contacts for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'List of contacts' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(@Param('customerId') customerId: string) {
    const contacts = await this.contactRepo.findByCustomerId(customerId)
    return {
      contacts: contacts.map((c) => ({
        id: c.id.value,
        name: c.name,
        email: c.email,
        phone: c.phone,
        role: c.role,
        isPrimary: c.isPrimary,
        createdAt: c.createdAt,
      })),
    }
  }

  @Patch(':contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a contact' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'contactId', description: 'Contact ID' })
  @ApiBody({ type: UpdateContactDto })
  @ApiResponse({ status: 204, description: 'Contact updated' })
  @ApiResponse({ status: 404, description: 'Contact or customer not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('customerId') customerId: string,
    @Param('contactId') contactId: string,
    @Body() body: UpdateContactDto,
  ) {
    const result = await this.updateContact.execute({
      customerId,
      contactId,
      ...body,
    })

    if (result.isLeft()) {
      const error = result.value
      if (error instanceof ContactNotFoundError) throw new NotFoundException(error.message)
      throw new NotFoundException(error.message)
    }
  }

  @Delete(':contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'contactId', description: 'Contact ID' })
  @ApiResponse({ status: 204, description: 'Contact deleted' })
  @ApiResponse({ status: 404, description: 'Contact or customer not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(
    @Param('customerId') customerId: string,
    @Param('contactId') contactId: string,
  ) {
    const result = await this.deleteContact.execute({ customerId, contactId })

    if (result.isLeft()) {
      const error = result.value
      if (error instanceof ContactNotFoundError) throw new NotFoundException(error.message)
      throw new NotFoundException(error.message)
    }
  }
}
