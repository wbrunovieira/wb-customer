import { redirect } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { CurrentUser } from '@/lib/definitions'
import PortalSidebar from './_components/portal-sidebar'
import PortalHeader from './_components/portal-header'
import { ToastProvider } from '@/components/toast/toast-context'
import ToastContainer from '@/components/toast/toast-container'

async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await apiServer.get<CurrentUser>('/api/v1/auth/me')
  } catch {
    return null
  }
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'customer') {
    redirect('/dashboard')
  }

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <PortalSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <PortalHeader user={user} />
          <main className="flex-1 overflow-y-auto bg-canvas p-6">
            {children}
          </main>
        </div>
        <ToastContainer />
      </div>
    </ToastProvider>
  )
}
