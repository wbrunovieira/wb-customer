import { apiServer } from '@/lib/api-server'
import { MeetingType } from '@/lib/definitions'
import MeetingTypesManager from './_components/meeting-types-manager'

export const metadata = { title: 'Tipos de Reunião — WB Customer' }

export default async function AdminMeetingTypesPage() {
  let meetingTypes: MeetingType[] = []

  try {
    const res = await apiServer.get<{ meetingTypes: MeetingType[] }>('/api/v1/meeting-types?onlyActive=false')
    meetingTypes = res.meetingTypes
  } catch {
    // empty
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-hi">Tipos de Reunião</h1>
        <p className="mt-1 text-sm text-md">
          Configure os tipos disponíveis para agendar reuniões com clientes.
        </p>
      </div>

      <MeetingTypesManager initialTypes={meetingTypes} />
    </div>
  )
}
