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
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { ListUsersUseCase } from '@/domain/auth/application/use-cases/list-users.use-case'
import { UpdateUserProfileUseCase } from '@/domain/auth/application/use-cases/update-user-profile.use-case'
import { UserNotFoundError } from '@/domain/auth/domain/exceptions/user-not-found.error'

class UpdateProfileDto {
  name?: string
  phone?: string | null
  avatarUrl?: string | null
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly updateUserProfile: UpdateUserProfileUseCase,
  ) {}

  @Get()
  @Roles('admin', 'manager')
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
