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
  name!: string
  email?: string
  phone?: string
  role?: string
  isPrimary?: boolean
}

class UpdateContactDto {
  name?: string
  email?: string | null
  phone?: string | null
  role?: string | null
  isPrimary?: boolean
}

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
