import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MeetingsController } from '@/infra/controllers/meetings.controller'
import { MeetingTypesController } from '@/infra/controllers/meeting-types.controller'
import { GoogleOAuthController } from '@/infra/controllers/google-oauth.controller'
import { ScheduleMeetingUseCase } from '@/domain/meetings/application/use-cases/schedule-meeting.use-case'
import { GetMeetingUseCase } from '@/domain/meetings/application/use-cases/get-meeting.use-case'
import { ListCustomerMeetingsUseCase } from '@/domain/meetings/application/use-cases/list-customer-meetings.use-case'
import { UpdateMeetingUseCase } from '@/domain/meetings/application/use-cases/update-meeting.use-case'
import { CancelMeetingUseCase } from '@/domain/meetings/application/use-cases/cancel-meeting.use-case'
import { UpdateMeetingSummaryUseCase } from '@/domain/meetings/application/use-cases/update-meeting-summary.use-case'
import { CreateMeetingTypeUseCase } from '@/domain/meetings/application/use-cases/create-meeting-type.use-case'
import { ListMeetingTypesUseCase } from '@/domain/meetings/application/use-cases/list-meeting-types.use-case'
import { UpdateMeetingTypeUseCase } from '@/domain/meetings/application/use-cases/update-meeting-type.use-case'
import { DeleteMeetingTypeUseCase } from '@/domain/meetings/application/use-cases/delete-meeting-type.use-case'
import { MeetingRsvpCheckerService } from '@/infra/services/meetings/meeting-rsvp-checker.service'
import { MeetingRecordingDetectorService } from '@/infra/services/meetings/meeting-recording-detector.service'
import { MeetingTranscriptionPollerService } from '@/infra/services/meetings/meeting-transcription-poller.service'
import { ICalendarAdapter } from '@/domain/meetings/application/services/i-calendar.adapter'
import { IGoogleTokenService } from '@/domain/meetings/application/services/i-google-token.service'
import { IMeetingRepository } from '@/domain/meetings/application/repositories/i-meeting.repository'
import { IMeetingTypeRepository } from '@/domain/meetings/application/repositories/i-meeting-type.repository'
import { GoogleCalendarAdapter } from '@/infra/adapters/calendar/google-calendar.adapter'
import { MockCalendarAdapter } from '@/infra/adapters/calendar/mock-calendar.adapter'
import { Env } from '@/env/env'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
  ],
  controllers: [
    MeetingsController,
    MeetingTypesController,
    GoogleOAuthController,
  ],
  providers: [
    // Calendar adapter — swap based on CALENDAR_ADAPTER env var
    // Note: IGoogleTokenService is provided globally by DatabaseModule
    {
      provide: ICalendarAdapter,
      useFactory: (config: ConfigService<Env, true>, tokenService: IGoogleTokenService) => {
        const adapter = config.get('CALENDAR_ADAPTER', { infer: true })
        if (adapter === 'google-calendar') {
          return new GoogleCalendarAdapter(tokenService, config)
        }
        return new MockCalendarAdapter()
      },
      inject: [ConfigService, IGoogleTokenService],
    },
    // Use cases — Meetings
    ScheduleMeetingUseCase,
    GetMeetingUseCase,
    ListCustomerMeetingsUseCase,
    UpdateMeetingUseCase,
    CancelMeetingUseCase,
    UpdateMeetingSummaryUseCase,
    // Use cases — Meeting Types
    CreateMeetingTypeUseCase,
    ListMeetingTypesUseCase,
    UpdateMeetingTypeUseCase,
    DeleteMeetingTypeUseCase,
    // Cron services
    MeetingRsvpCheckerService,
    MeetingRecordingDetectorService,
    MeetingTranscriptionPollerService,
  ],
})
export class MeetingsModule {}
