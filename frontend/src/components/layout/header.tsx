import { CurrentUser } from '@/lib/definitions'
import LogoutButton from './logout-button'
import NotificationBell from './notification-bell'

type Props = {
  user: CurrentUser | null
}

export default function Header({ user }: Props) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-canvas/80 px-6 backdrop-blur-sm">
      <div />
      <div className="flex items-center gap-3">
        {user && (
          <>
            <NotificationBell />
            <div className="text-right">
              <p className="text-sm font-medium text-hi">{user.name}</p>
              <p className="text-xs text-md capitalize">{user.role}</p>
            </div>
            <div className="btn-brand flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </>
        )}
        <LogoutButton />
      </div>
    </header>
  )
}
