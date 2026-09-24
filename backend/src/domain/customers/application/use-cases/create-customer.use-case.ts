import { Injectable, Logger } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '../repositories/i-customer.repository'
import { ICustomerActivityRepository } from '../repositories/i-customer-activity.repository'
import { ICustomerCategoryRepository } from '../repositories/i-customer-category.repository'
import { ICustomerFolderService } from '../services/i-customer-folder.service'
import { Customer } from '../../enterprise/entities/customer'
import { CustomerActivity } from '../../enterprise/entities/customer-activity'
import { CustomerAlreadyExistsError } from '../../domain/exceptions/customer-already-exists.error'
import { CustomerCategoryNotFoundError } from '../../domain/exceptions/customer-category-not-found.error'

export interface CreateCustomerRequest {
  name: string
  email: string
  phone?: string
  document?: string
  website?: string
  notes?: string
  categoryId?: string
  createdByUserId: string
}

export interface CreateCustomerResponse {
  customerId: string
}

export type CreateCustomerResult = Either<
  CustomerAlreadyExistsError | CustomerCategoryNotFoundError,
  CreateCustomerResponse
>

@Injectable()
export class CreateCustomerUseCase {
  private readonly logger = new Logger(CreateCustomerUseCase.name)

  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly activityRepo: ICustomerActivityRepository,
    private readonly categoryRepo: ICustomerCategoryRepository,
    private readonly folderService: ICustomerFolderService,
  ) {}

  async execute(request: CreateCustomerRequest): Promise<CreateCustomerResult> {
    const existing = await this.customerRepo.findByEmail(request.email)
    if (existing) {
      return left(new CustomerAlreadyExistsError(request.email))
    }

    if (request.categoryId) {
      const category = await this.categoryRepo.findById(request.categoryId)
      if (!category) {
        return left(new CustomerCategoryNotFoundError(request.categoryId))
      }
    }

    const customer = Customer.create({
      name: request.name,
      email: request.email,
      phone: request.phone,
      document: request.document,
      website: request.website,
      notes: request.notes,
      categoryId: request.categoryId,
      createdByUserId: request.createdByUserId,
    })

    // A pasta no Drive é desejável, não condição para o cliente existir.
    //
    // Antes daqui uma falha do Drive derrubava o cadastro inteiro com 500: sem
    // o Google conectado, nenhum cliente podia ser criado — e o motivo não
    // aparecia na tela, só no log do servidor. Um CRM que recusa cadastrar
    // cliente porque uma integração de armazenamento está fora troca um
    // problema pequeno por um total.
    //
    // Quem ficar sem pasta fica com driveFolderId nulo, que é o mesmo estado de
    // antes de o Drive existir — dá para criar depois, sem migração.
    try {
      const folderId = await this.folderService.createFolder(request.name)
      customer.setDriveFolderId(folderId)
    } catch (err) {
      this.logger.warn(
        `Cliente "${request.name}" criado sem pasta no Drive: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }

    await this.customerRepo.save(customer)

    await this.activityRepo.save(
      CustomerActivity.create({
        customerId: customer.id.value,
        userId: request.createdByUserId,
        type: 'created',
        description: `Customer "${request.name}" created`,
      }),
    )

    return right({ customerId: customer.id.value })
  }
}
