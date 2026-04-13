import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IUserIdentityRepository } from '../repositories/i-user-identity.repository'
import { IUserAuthorizationRepository } from '../repositories/i-user-authorization.repository'
import { IRefreshTokenRepository } from '../repositories/i-refresh-token.repository'
import { ITokenService } from '../services/i-token.service'
import { ICustomerPortalLookup } from '../services/i-customer-portal-lookup'
import { Email } from '../../enterprise/value-objects/email.vo'
import { Password } from '../../enterprise/value-objects/password.vo'
import { RefreshToken } from '../../enterprise/entities/refresh-token'
import { InvalidCredentialsError } from '../../domain/exceptions/invalid-credentials.error'

export interface AuthenticateUserRequest {
  email: string
  password: string
}

export interface AuthenticateUserResponse {
  accessToken: string
  refreshToken: string
  userId: string
  role: string
  customerId?: string
  customerRole?: string
}

export type AuthenticateUserResult = Either<
  InvalidCredentialsError,
  AuthenticateUserResponse
>

@Injectable()
export class AuthenticateUserUseCase {
  constructor(
    private readonly userIdentityRepo: IUserIdentityRepository,
    private readonly userAuthorizationRepo: IUserAuthorizationRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly tokenService: ITokenService,
    private readonly customerPortalLookup: ICustomerPortalLookup,
  ) {}

  async execute(
    request: AuthenticateUserRequest,
  ): Promise<AuthenticateUserResult> {
    const emailOrError = Email.create(request.email)
    if (emailOrError.isLeft()) return left(new InvalidCredentialsError())

    const identity = await this.userIdentityRepo.findByEmail(emailOrError.value)
    if (!identity) return left(new InvalidCredentialsError())

    const password = Password.createFromHash(identity.passwordHash)
    const isValid = await password.compare(request.password)
    if (!isValid) return left(new InvalidCredentialsError())

    const authorization = await this.userAuthorizationRepo.findByUserId(
      identity.id.value,
    )
    if (!authorization) return left(new InvalidCredentialsError())

    let customerId: string | undefined
    let customerRole: string | undefined

    if (authorization.role.value === 'customer') {
      const portalData = await this.customerPortalLookup.findByUserId(identity.id.value)
      if (!portalData) return left(new InvalidCredentialsError())
      customerId = portalData.customerId
      customerRole = portalData.customerRole
    }

    const accessToken = this.tokenService.generateAccessToken({
      sub: identity.id.value,
      role: authorization.role.value,
      customerId,
      customerRole,
    })

    const rawRefreshToken = this.tokenService.generateRefreshToken()
    const expiresAt = this.tokenService.getRefreshTokenExpiry()

    const refreshToken = RefreshToken.create({
      userId: identity.id.value,
      token: rawRefreshToken,
      expiresAt,
    })

    await this.refreshTokenRepo.save(refreshToken)

    return right({
      accessToken,
      refreshToken: rawRefreshToken,
      userId: identity.id.value,
      role: authorization.role.value,
      customerId,
      customerRole,
    })
  }
}
