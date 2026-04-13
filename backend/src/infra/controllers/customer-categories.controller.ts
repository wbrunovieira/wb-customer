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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
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
  @ApiProperty({ example: 'Enterprise' })
  name!: string

  @ApiPropertyOptional({ example: 'Large companies with 500+ employees' })
  description?: string
}

class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Enterprise' })
  name?: string

  @ApiPropertyOptional({ example: 'Updated description', nullable: true })
  description?: string | null

  @ApiPropertyOptional({ example: true })
  isActive?: boolean
}

@ApiTags('Customer Categories')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Create a customer category (admin only)' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: 'Category created', schema: { example: { categoryId: 'uuid' } } })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'List customer categories' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean, description: 'Filter only active categories' })
  @ApiResponse({ status: 200, description: 'List of categories', schema: { example: { categories: [{ id: 'uuid', name: 'Enterprise', description: null, isActive: true, createdAt: '2024-01-01T00:00:00.000Z' }] } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Update a customer category (admin only)' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 204, description: 'Category updated' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category name already in use' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Soft-delete a customer category (admin only)' })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(@Param('id') id: string) {
    const result = await this.deleteCategory.execute({ categoryId: id })

    if (result.isLeft()) {
      const error = result.value
      throw new NotFoundException((error as CustomerCategoryNotFoundError).message)
    }
  }
}
