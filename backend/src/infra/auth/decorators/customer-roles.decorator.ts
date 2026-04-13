import { SetMetadata } from '@nestjs/common'

export const CUSTOMER_ROLES_KEY = 'customer_roles'

export const CustomerRoles = (...roles: string[]) =>
  SetMetadata(CUSTOMER_ROLES_KEY, roles)
