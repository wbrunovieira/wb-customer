import { apiServer } from '@/lib/api-server'
import { CurrentUser } from '@/lib/definitions'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import PreventFileDrop from '@/components/prevent-file-drop'
import { ToastProvider } from '@/components/toast/toast-context'
import ToastContainer from '@/components/toast/toast-container'

async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await apiServer.get<CurrentUser>('/api/v1/auth/me')
  } catch {
    return null
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <PreventFileDrop />
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header user={user} />
          <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
            {children}
          </main>
        </div>
        <ToastContainer />
      </div>
    </ToastProvider>
  )
}
