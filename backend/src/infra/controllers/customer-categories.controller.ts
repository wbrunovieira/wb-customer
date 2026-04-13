import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CreateCustomerCategoryUseCase } from '@/domain/customers/application/use-cases/create-customer-category.use-case'
import { ListCustomerCategoriesUseCase } from '@/domain/customers/application/use-cases/list-customer-categories.use-case'
import { UpdateCustomerCategoryUseCase } from '@/domain/customers/application/use-cases/update-customer-category.use-case'
import { DeleteCustomerCategoryUseCase } from '@/domain/customers/application/use-cases/delete-customer-category.use-case'
import { CustomerCategoryAlreadyExistsError } from '@/domain/customers/domain/exceptions/customer-category-already-exists.error'
import { CustomerCategoryNotFoundError } from '@/domain/customers/domain/exceptions/customer-category-not-found.error'

class CreateCategoryDto {
  name!: string
  description?: string
}

class UpdateCategoryDto {
  name?: string
  description?: string | null
  isActive?: boolean
}

@Controller('customer-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerCategoriesController {
  constructor(
    private readonly createCategory: CreateCustomerCategoryUseCase,
    private readonly listCategories: ListCustomerCategoriesUseCase,
    private readonly updateCategory: UpdateCustomerCategoryUseCase,
    private readonly deleteCategory: DeleteCustomerCategoryUseCase,
  ) {}

  @Post()
  @Roles('admin')
  async create(@Body() body: CreateCategoryDto) {
    const result = await this.createCategory.execute({
      name: body.name,
      description: body.description,
    })

    if (result.isLeft()) {
      throw new ConflictException(result.value.message)
    }

    return { categoryId: result.value.categoryId }
  }

  @Get()
  async list(@Query('onlyActive') onlyActive?: string) {
    const result = await this.listCategories.execute({
      onlyActive: onlyActive === 'true' ? true : undefined,
    })
    return { categories: result.value.categories.map((c) => ({
      id: c.id.value,
      name: c.name,
      description: c.description,
      isActive: c.isActive,
      createdAt: c.createdAt,
    }))}
  }

  @Patch(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    const result = await this.updateCategory.execute({
      categoryId: id,
      name: body.name,
      description: body.description,
      isActive: body.isActive,
    })

    if (result.isLeft()) {
      const error = result.value
      if (error instanceof CustomerCategoryNotFoundError) {
        throw new NotFoundException(error.message)
      }
      if (error instanceof CustomerCategoryAlreadyExistsError) {
        throw new ConflictException(error.message)
      }
      throw new NotFoundException()
    }
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    const result = await this.deleteCategory.execute({ categoryId: id })

    if (result.isLeft()) {
      const error = result.value
      throw new NotFoundException((error as CustomerCategoryNotFoundError).message)
    }
  }
}
