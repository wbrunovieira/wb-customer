export class ChannelNotAvailableError extends Error {
  constructor(channelId: string, reason: 'not-in-group' | 'disabled') {
    super(
      reason === 'disabled'
        ? `Canal "${channelId}" está desativado no motor e não publicaria.`
        : `Canal "${channelId}" não pertence ao grupo deste cliente.`,
    )
    this.name = 'ChannelNotAvailableError'
  }
}
