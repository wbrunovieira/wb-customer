/**
 * Thin port that lets the auth use-case enrich the JWT
 * with portal-specific claims without depending on the customers domain.
 */
export abstract class ICustomerPortalLookup {
  abstract findByUserId(
    userId: string,
  ): Promise<{ customerId: string; customerRole: string } | null>
}
