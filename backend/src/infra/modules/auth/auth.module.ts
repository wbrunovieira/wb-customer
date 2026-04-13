import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { Env } from '@/env/env'
import { ITokenService } from '@/domain/auth/application/services/i-token.service'
import { JwtTokenService } from '@/infra/auth/services/jwt-token.service'
import { JwtStrategy } from '@/infra/auth/strategies/jwt.strategy'
import { CreateUserUseCase } from '@/domain/auth/application/use-cases/create-user.use-case'
import { AuthenticateUserUseCase } from '@/domain/auth/application/use-cases/authenticate-user.use-case'
import { RefreshAccessTokenUseCase } from '@/domain/auth/application/use-cases/refresh-access-token.use-case'
import { LogoutUseCase } from '@/domain/auth/application/use-cases/logout.use-case'
import { GetCurrentUserUseCase } from '@/domain/auth/application/use-cases/get-current-user.use-case'
import { ListUsersUseCase } from '@/domain/auth/application/use-cases/list-users.use-case'
import { UpdateUserProfileUseCase } from '@/domain/auth/application/use-cases/update-user-profile.use-case'

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  providers: [
    JwtStrategy,
    { provide: ITokenService, useClass: JwtTokenService },
    CreateUserUseCase,
    AuthenticateUserUseCase,
    RefreshAccessTokenUseCase,
    LogoutUseCase,
    GetCurrentUserUseCase,
    ListUsersUseCase,
    UpdateUserProfileUseCase,
  ],
  exports: [
    ITokenService,
    CreateUserUseCase,
    AuthenticateUserUseCase,
    RefreshAccessTokenUseCase,
    LogoutUseCase,
    GetCurrentUserUseCase,
    ListUsersUseCase,
    UpdateUserProfileUseCase,
  ],
})
export class AuthModule {}
