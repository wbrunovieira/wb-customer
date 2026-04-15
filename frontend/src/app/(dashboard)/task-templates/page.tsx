import { apiServer } from '@/lib/api-server'
import { TaskTemplate, PaginatedResponse, Customer } from '@/lib/definitions'
import TemplatesClient from './_components/templates-client'

export const metadata = { title: 'Templates de Tarefas — WB Customer' }

export default async function TaskTemplatesPage() {
  let templates: TaskTemplate[] = []
  let customers: Customer[] = []

  try {
    const [templatesRes, customersRes] = await Promise.all([
      apiServer.get<{ templates: TaskTemplate[] }>('/api/v1/task-templates'),
      apiServer.get<PaginatedResponse<Customer>>('/api/v1/customers?limit=200'),
    ])
    templates = templatesRes.templates
    customers = customersRes.items
  } catch {
    // show empty state
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Templates de Tarefas</h1>
        <p className="mt-1 text-sm text-md">
          Conjuntos de tarefas pré-definidos para aplicar rapidamente a qualquer cliente.
        </p>
      </div>

      <TemplatesClient initialTemplates={templates} customers={customers} />
    </div>
  )
}
