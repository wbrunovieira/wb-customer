export class ForbiddenPortalActionError extends Error {
  constructor(reason = 'Insufficient portal permissions') {
    super(reason)
    this.name = 'ForbiddenPortalActionError'
  }
}
