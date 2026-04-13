import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

export interface JwtPayload {
  sub: string
  role: string
  customerId?: string
  customerRole?: string
  iat: number
  exp: number
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    })
  }

  validate(payload: JwtPayload): { userId: string; role: string; customerId?: string; customerRole?: string } {
    return {
      userId: payload.sub,
      role: payload.role,
      customerId: payload.customerId,
      customerRole: payload.customerRole,
    }
  }
}
