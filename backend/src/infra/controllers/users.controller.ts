import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
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
import { ApiPropertyOptional } from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { ListUsersUseCase } from '@/domain/auth/application/use-cases/list-users.use-case'
import { UpdateUserProfileUseCase } from '@/domain/auth/application/use-cases/update-user-profile.use-case'
import { UserNotFoundError } from '@/domain/auth/domain/exceptions/user-not-found.error'

class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  name?: string

  @ApiPropertyOptional({ example: '+5511999999999', nullable: true })
  phone?: string | null

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', nullable: true })
  avatarUrl?: string | null
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly updateUserProfile: UpdateUserProfileUseCase,
  ) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List all users (admin/manager only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.listUsers.execute({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })

    return result.value
  }

  @Patch(':id/profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 204, description: 'Profile updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @Param('id') id: string,
    @Body() body: UpdateProfileDto,
  ) {
    const result = await this.updateUserProfile.execute({
      userId: id,
      name: body.name,
      phone: body.phone,
      avatarUrl: body.avatarUrl,
    })

    if (result.isLeft()) {
      const error = result.value
      if (error instanceof UserNotFoundError) {
        throw new NotFoundException(error.message)
      }
      throw new NotFoundException()
    }
  }
}
