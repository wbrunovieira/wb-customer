import { CurrentUser } from '@/lib/definitions'
import LogoutButton from './logout-button'
import NotificationBell from './notification-bell'

type Props = {
  user: CurrentUser | null
}

export default function Header({ user }: Props) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-3">
        {user && (
          <>
            <NotificationBell />
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </>
        )}
        <LogoutButton />
      </div>
    </header>
  )
}
