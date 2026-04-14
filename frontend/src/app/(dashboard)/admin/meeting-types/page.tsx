import { apiServer } from '@/lib/api-server'
import { MeetingType } from '@/lib/definitions'
import MeetingTypesManager from './_components/meeting-types-manager'

export const metadata = { title: 'Tipos de Reunião — WB Customer' }

export default async function AdminMeetingTypesPage() {
  let meetingTypes: MeetingType[] = []

  try {
    meetingTypes = await apiServer.get<MeetingType[]>('/api/v1/meeting-types?onlyActive=false')
  } catch {
    // empty
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tipos de Reunião</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure os tipos disponíveis para agendar reuniões com clientes.
        </p>
      </div>

      <MeetingTypesManager initialTypes={meetingTypes} />
    </div>
  )
}
