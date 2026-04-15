import { Injectable } from '@nestjs/common'
import { Subject, Observable, merge } from 'rxjs'
import { filter, map } from 'rxjs/operators'

export interface NotificationPayload {
  type: string
  title: string
  body: string
  meta?: Record<string, unknown>
}

interface NotificationEnvelope {
  userId: string
  payload: NotificationPayload
}

@Injectable()
export class NotificationsService {
  private readonly subject = new Subject<NotificationEnvelope>()
  private readonly broadcastSubject = new Subject<NotificationPayload>()

  /** Push a notification to a specific user (e.g. task assigned to them). */
  push(userId: string, payload: NotificationPayload): void {
    this.subject.next({ userId, payload })
  }

  /** Push a notification to ALL connected users (e.g. incoming WhatsApp, email, call). */
  pushBroadcast(payload: NotificationPayload): void {
    this.broadcastSubject.next(payload)
  }

  stream(userId: string): Observable<MessageEvent> {
    const toEvent = (payload: NotificationPayload) =>
      ({ data: JSON.stringify(payload) }) as unknown as MessageEvent

    const personal$ = this.subject.asObservable().pipe(
      filter((envelope) => envelope.userId === userId),
      map((envelope) => toEvent(envelope.payload)),
    )

    const broadcast$ = this.broadcastSubject.asObservable().pipe(
      map(toEvent),
    )

    return merge(personal$, broadcast$)
  }
}
