import { apiServer } from '@/lib/api-server'
import { PortalUser } from '@/lib/definitions'
import PortalUsersManager from './_components/portal-users-manager'

export const metadata = { title: 'Usuários — Portal do Cliente' }

export default async function PortalUsersPage() {
  let users: PortalUser[] = []

  try {
    const res = await apiServer.get<{ users: PortalUser[] }>('/api/v1/portal/users')
    users = res.users
  } catch {
    // 403 if not master — show empty gracefully
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Usuários do Portal</h1>
        <p className="mt-1 text-sm text-md">
          Gerencie os usuários com acesso ao portal da sua empresa.
        </p>
      </div>
      <PortalUsersManager initialUsers={users} />
    </div>
  )
}
