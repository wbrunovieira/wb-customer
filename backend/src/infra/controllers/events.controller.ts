import { Controller, Get, UseGuards, Sse, MessageEvent, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { Observable } from 'rxjs'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { NotificationsService } from '@/infra/notifications/notifications.service'

interface AuthenticatedRequest extends Request {
  user: { sub: string }
}

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Sse()
  @ApiOperation({ summary: 'SSE stream of real-time notifications for the authenticated user' })
  @ApiResponse({ status: 200, description: 'text/event-stream' })
  stream(@Request() req: AuthenticatedRequest): Observable<MessageEvent> {
    const userId = req.user.sub
    return this.notifications.stream(userId)
  }
}
