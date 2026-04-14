import { CurrentUser } from '@/lib/definitions'
import LogoutButton from '@/components/layout/logout-button'

type Props = { user: CurrentUser }

export default function PortalHeader({ user }: Props) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{user.name}</p>
          <p className="text-xs text-slate-500">Portal do Cliente</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <LogoutButton />
      </div>
    </header>
  )
}
