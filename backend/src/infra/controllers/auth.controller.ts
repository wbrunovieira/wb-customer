import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { Request as ExpressRequest } from 'express'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { AuthenticateUserUseCase } from '@/domain/auth/application/use-cases/authenticate-user.use-case'
import { CreateUserUseCase } from '@/domain/auth/application/use-cases/create-user.use-case'
import { RefreshAccessTokenUseCase } from '@/domain/auth/application/use-cases/refresh-access-token.use-case'
import { LogoutUseCase } from '@/domain/auth/application/use-cases/logout.use-case'
import { GetCurrentUserUseCase } from '@/domain/auth/application/use-cases/get-current-user.use-case'
import { UserAlreadyExistsError } from '@/domain/auth/domain/exceptions/user-already-exists.error'
import { InvalidCredentialsError } from '@/domain/auth/domain/exceptions/invalid-credentials.error'
import { InvalidTokenError } from '@/domain/auth/domain/exceptions/invalid-token.error'

interface AuthenticatedRequest extends ExpressRequest {
  user: { userId: string; role: string }
}

class RegisterDto {
  email!: string
  password!: string
  name!: string
  phone?: string
  role!: string
}

class LoginDto {
  email!: string
  password!: string
}

class RefreshDto {
  refreshToken!: string
}

class LogoutDto {
  refreshToken!: string
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly authenticateUser: AuthenticateUserUseCase,
    private readonly refreshAccessToken: RefreshAccessTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const result = await this.createUser.execute({
      email: body.email,
      password: body.password,
      name: body.name,
      phone: body.phone,
      role: body.role,
    })

    if (result.isLeft()) {
      const error = result.value
      if (error instanceof UserAlreadyExistsError) {
        throw new ConflictException(error.message)
      }
      throw new BadRequestException(error.message)
    }

    return { userId: result.value.userId }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    const result = await this.authenticateUser.execute({
      email: body.email,
      password: body.password,
    })

    if (result.isLeft()) {
      const error = result.value
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException(error.message)
      }
      throw new UnauthorizedException()
    }

    return result.value
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshDto) {
    const result = await this.refreshAccessToken.execute({
      refreshToken: body.refreshToken,
    })

    if (result.isLeft()) {
      const error = result.value
      if (error instanceof InvalidTokenError) {
        throw new UnauthorizedException(error.message)
      }
      throw new UnauthorizedException()
    }

    return result.value
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: LogoutDto) {
    const result = await this.logoutUseCase.execute({
      refreshToken: body.refreshToken,
    })

    if (result.isLeft()) {
      const error = result.value
      if (error instanceof InvalidTokenError) {
        throw new UnauthorizedException(error.message)
      }
      throw new UnauthorizedException()
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: AuthenticatedRequest) {
    const result = await this.getCurrentUser.execute({
      userId: req.user.userId,
    })

    if (result.isLeft()) {
      throw new UnauthorizedException()
    }

    return result.value
  }
}
