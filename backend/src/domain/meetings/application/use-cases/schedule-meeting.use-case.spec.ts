import { describe, it, expect, beforeEach } from 'vitest'
import { ScheduleMeetingUseCase } from './schedule-meeting.use-case'
import { InMemoryMeetingRepository } from '@/test/repositories/meetings/in-memory-meeting.repository'
import { InMemoryMeetingTypeRepository } from '@/test/repositories/meetings/in-memory-meeting-type.repository'
import { MockCalendarAdapter } from '@/test/repositories/meetings/mock-calendar.adapter'
import { InMemoryCustomerRepository } from '@/test/repositories/customers/in-memory-customer.repository'
import { InMemoryCustomerActivityRepository } from '@/test/repositories/customers/in-memory-customer-activity.repository'
import { Customer } from '@/domain/customers/enterprise/entities/customer'
import { MeetingType } from '@/domain/meetings/enterprise/entities/meeting-type'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { MeetingTypeNotFoundError } from '../../domain/exceptions/meeting-type-not-found.error'

let meetingRepo: InMemoryMeetingRepository
let meetingTypeRepo: InMemoryMeetingTypeRepository
let calendarAdapter: MockCalendarAdapter
let customerRepo: InMemoryCustomerRepository
let activityRepo: InMemoryCustomerActivityRepository
let sut: ScheduleMeetingUseCase

const customerId = 'customer-1'
const userId = 'user-1'

const startAt = new Date('2026-05-01T10:00:00Z')
const endAt = new Date('2026-05-01T11:00:00Z')

beforeEach(() => {
  meetingRepo = new InMemoryMeetingRepository()
  meetingTypeRepo = new InMemoryMeetingTypeRepository()
  calendarAdapter = new MockCalendarAdapter()
  customerRepo = new InMemoryCustomerRepository()
  activityRepo = new InMemoryCustomerActivityRepository()
  sut = new ScheduleMeetingUseCase(
    meetingRepo,
    meetingTypeRepo,
    calendarAdapter,
    customerRepo,
    activityRepo,
  )

  customerRepo.items.push(
    Customer.create(
      { name: 'Acme Corp', email: 'acme@test.com', createdByUserId: userId },
      new UniqueEntityID(customerId),
    ),
  )
})

describe('ScheduleMeetingUseCase', () => {
  it('should schedule a meeting and create a Google Calendar event', async () => {
    const result = await sut.execute({
      customerId,
      title: 'Kickoff',
      startAt,
      endAt,
      attendeeEmails: ['a@test.com'],
      scheduledByUserId: userId,
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.meetingId).toBeDefined()
      expect(result.value.googleEventId).toBeTruthy()
      expect(result.value.meetLink).toBeTruthy()
    }
    expect(meetingRepo.items).toHaveLength(1)
    expect(calendarAdapter.createdEvents).toHaveLength(1)
  })

  it('should record a meeting_scheduled activity', async () => {
    await sut.execute({
      customerId,
      title: 'Kickoff',
      startAt,
      endAt,
      attendeeEmails: [],
      scheduledByUserId: userId,
    })

    expect(activityRepo.items).toHaveLength(1)
    expect(activityRepo.items[0].type).toBe('meeting_scheduled')
  })

  it('should return CustomerNotFoundError for unknown customer', async () => {
    const result = await sut.execute({
      customerId: 'unknown',
      title: 'Meeting',
      startAt,
      endAt,
      attendeeEmails: [],
      scheduledByUserId: userId,
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerNotFoundError)
    }
    expect(meetingRepo.items).toHaveLength(0)
  })

  it('should return MeetingTypeNotFoundError for unknown meeting type', async () => {
    const result = await sut.execute({
      customerId,
      meetingTypeId: 'type-unknown',
      title: 'Meeting',
      startAt,
      endAt,
      attendeeEmails: [],
      scheduledByUserId: userId,
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(MeetingTypeNotFoundError)
    }
  })

  it('should schedule even if calendar adapter fails', async () => {
    calendarAdapter.createEvent = async () => { throw new Error('calendar down') }

    const result = await sut.execute({
      customerId,
      title: 'Meeting',
      startAt,
      endAt,
      attendeeEmails: ['a@test.com'],
      scheduledByUserId: userId,
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.googleEventId).toBeNull()
    }
    expect(meetingRepo.items).toHaveLength(1)
  })

  it('should use provided meeting type when valid', async () => {
    const meetingType = MeetingType.create({ name: 'Demo', durationMinutes: 30 })
    meetingTypeRepo.items.push(meetingType)

    const result = await sut.execute({
      customerId,
      meetingTypeId: meetingType.id.value,
      title: 'Demo Call',
      startAt,
      endAt,
      attendeeEmails: [],
      scheduledByUserId: userId,
    })

    expect(result.isRight()).toBe(true)
    expect(meetingRepo.items[0].meetingTypeId).toBe(meetingType.id.value)
  })
})
