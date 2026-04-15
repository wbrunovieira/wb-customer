import { describe, it, expect, beforeEach } from 'vitest'
import { firstValueFrom, take, toArray } from 'rxjs'
import { NotificationsService, NotificationPayload } from './notifications.service'

let sut: NotificationsService

beforeEach(() => {
  sut = new NotificationsService()
})

function parseEvent(event: unknown): NotificationPayload {
  return JSON.parse((event as { data: string }).data) as NotificationPayload
}

describe('NotificationsService.push', () => {
  it('should emit to the target user stream', async () => {
    const p = firstValueFrom(sut.stream('user-1').pipe(take(1)))
    sut.push('user-1', { type: 'task.created', title: 'Nova tarefa', body: 'Teste' })
    const event = await p
    expect(parseEvent(event).type).toBe('task.created')
  })

  it('should NOT emit to a different user stream', async () => {
    let received = false
    sut.stream('user-2').subscribe(() => { received = true })
    sut.push('user-1', { type: 'task.created', title: 'Nova tarefa', body: 'Teste' })
    await new Promise((r) => setTimeout(r, 10))
    expect(received).toBe(false)
  })

  it('should carry meta payload', async () => {
    const p = firstValueFrom(sut.stream('user-1').pipe(take(1)))
    sut.push('user-1', { type: 'task.created', title: 'T', body: 'B', meta: { taskId: 'abc' } })
    const event = await p
    expect(parseEvent(event).meta?.taskId).toBe('abc')
  })
})

describe('NotificationsService.pushBroadcast', () => {
  it('should emit to ALL subscriber streams regardless of userId', async () => {
    const p1 = firstValueFrom(sut.stream('user-1').pipe(take(1)))
    const p2 = firstValueFrom(sut.stream('user-2').pipe(take(1)))
    const p3 = firstValueFrom(sut.stream('user-99').pipe(take(1)))

    sut.pushBroadcast({ type: 'activity.whatsapp', title: 'WA', body: 'msg' })

    const [e1, e2, e3] = await Promise.all([p1, p2, p3])
    expect(parseEvent(e1).type).toBe('activity.whatsapp')
    expect(parseEvent(e2).type).toBe('activity.whatsapp')
    expect(parseEvent(e3).type).toBe('activity.whatsapp')
  })

  it('should carry type, title, body, meta in broadcast', async () => {
    const p = firstValueFrom(sut.stream('user-1').pipe(take(1)))
    sut.pushBroadcast({
      type: 'activity.email',
      title: 'E-mail — João',
      body: 'Proposta comercial',
      meta: { customerId: 'cust-1', emailMessageId: 'msg-abc' },
    })
    const event = await p
    const payload = parseEvent(event)
    expect(payload.type).toBe('activity.email')
    expect(payload.title).toBe('E-mail — João')
    expect(payload.meta?.customerId).toBe('cust-1')
  })

  it('should deliver broadcast AND personal notification on the same stream', async () => {
    const events = firstValueFrom(sut.stream('user-1').pipe(take(2), toArray()))
    sut.push('user-1', { type: 'personal', title: 'P', body: 'b' })
    sut.pushBroadcast({ type: 'broadcast', title: 'B', body: 'c' })
    const received = await events
    const types = received.map((e) => parseEvent(e).type)
    expect(types).toContain('personal')
    expect(types).toContain('broadcast')
  })

  it('broadcast should NOT appear on stream BEFORE subscription', async () => {
    // Broadcast before subscribing — late subscriber must NOT receive old events
    sut.pushBroadcast({ type: 'activity.phone_call', title: 'L', body: 'b' })
    let received = false
    sut.stream('late-user').subscribe(() => { received = true })
    await new Promise((r) => setTimeout(r, 10))
    expect(received).toBe(false)
  })
})
