import { Injectable } from '@nestjs/common'
import { Subject, Observable } from 'rxjs'
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

  push(userId: string, payload: NotificationPayload): void {
    this.subject.next({ userId, payload })
  }

  stream(userId: string): Observable<MessageEvent> {
    return this.subject.asObservable().pipe(
      filter((envelope) => envelope.userId === userId),
      map(
        (envelope) =>
          ({
            data: JSON.stringify(envelope.payload),
          }) as unknown as MessageEvent,
      ),
    )
  }
}
