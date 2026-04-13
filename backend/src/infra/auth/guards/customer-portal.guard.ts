import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { CUSTOMER_ROLES_KEY } from '../decorators/customer-roles.decorator'

interface PortalRequest {
  user: {
    userId: string
    role: string
    customerId?: string
    customerRole?: string
  }
}

/**
 * Guards portal routes: requires role=customer + valid customerId in JWT.
 * If @CustomerRoles('master') is set, also enforces the sub-role.
 */
@Injectable()
export class CustomerPortalGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<PortalRequest>()
    const { user } = request

    if (!user || user.role !== 'customer') {
      throw new ForbiddenException('Portal access requires role customer')
    }

    if (!user.customerId) {
      throw new UnauthorizedException('Token missing portal claims')
    }

    const requiredCustomerRoles = this.reflector.getAllAndOverride<string[]>(
      CUSTOMER_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (requiredCustomerRoles && requiredCustomerRoles.length > 0) {
      if (!requiredCustomerRoles.includes(user.customerRole ?? '')) {
        throw new ForbiddenException('Insufficient portal permissions')
      }
    }

    return true
  }
}
