export class InvalidRoleError extends Error {
  constructor(role: string) {
    super(
      `"${role}" is not a valid role. Valid roles: admin, manager, employee, customer`,
    )
    this.name = 'InvalidRoleError'
  }
}
