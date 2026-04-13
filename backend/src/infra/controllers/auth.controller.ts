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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
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
  @ApiProperty({ example: 'user@example.com' })
  email!: string

  @ApiProperty({ example: 'P@ssw0rd!' })
  password!: string

  @ApiProperty({ example: 'John Doe' })
  name!: string

  @ApiPropertyOptional({ example: '+5511999999999' })
  phone?: string

  @ApiProperty({ example: 'employee', enum: ['admin', 'manager', 'employee'] })
  role!: string
}

class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string

  @ApiProperty({ example: 'P@ssw0rd!' })
  password!: string
}

class RefreshDto {
  @ApiProperty({ description: 'Valid refresh token' })
  refreshToken!: string
}

class LogoutDto {
  @ApiProperty({ description: 'Refresh token to invalidate' })
  refreshToken!: string
}

@ApiTags('Auth')
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
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User created', schema: { example: { userId: 'uuid' } } })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiResponse({ status: 400, description: 'Validation error' })
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
  @ApiOperation({ summary: 'Authenticate and obtain tokens' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Returns access and refresh tokens', schema: { example: { accessToken: 'jwt', refreshToken: 'uuid' } } })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, description: 'Returns new access token', schema: { example: { accessToken: 'jwt' } } })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
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
  @ApiOperation({ summary: 'Invalidate refresh token' })
  @ApiBody({ type: LogoutDto })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
