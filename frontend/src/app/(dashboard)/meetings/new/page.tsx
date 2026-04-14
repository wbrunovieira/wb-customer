import { apiServer } from '@/lib/api-server'
import { CustomerListItem, MeetingType, PaginatedResponse } from '@/lib/definitions'
import ScheduleMeetingForm from './_components/schedule-meeting-form'

export const metadata = { title: 'Nova Reunião — WB Customer' }

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>
}) {
  const { customerId: preselectedCustomerId } = await searchParams

  const [customersRes, typesRes] = await Promise.all([
    apiServer.get<PaginatedResponse<CustomerListItem>>('/api/v1/customers?limit=200&status=active'),
    apiServer.get<{ meetingTypes: MeetingType[] }>('/api/v1/meeting-types?onlyActive=true'),
  ])
  const meetingTypes = typesRes.meetingTypes

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agendar Reunião</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cria o evento no Google Calendar e envia convite para os participantes.
        </p>
      </div>

      <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ScheduleMeetingForm
          customers={customersRes.items}
          meetingTypes={meetingTypes}
          preselectedCustomerId={preselectedCustomerId}
        />
      </div>
    </div>
  )
}
