'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'
import { TaskTemplate, TemplateTaskData } from '@/lib/definitions'

// ─── List ─────────────────────────────────────────────────────

export async function listTemplates(): Promise<{ templates: TaskTemplate[] }> {
  try {
    return await apiServer.get<{ templates: TaskTemplate[] }>('/api/v1/task-templates')
  } catch {
    return { templates: [] }
  }
}

// ─── Create from scratch ──────────────────────────────────────

export async function createTemplate(
  _state: unknown,
  formData: FormData,
) {
  const name = formData.get('name') as string
  const tasksJson = formData.get('tasks') as string

  if (!name?.trim()) return { errors: { name: ['Nome obrigatório'] } }

  let tasks: TemplateTaskData[] = []
  try {
    tasks = JSON.parse(tasksJson || '[]')
  } catch {
    return { errors: { tasks: ['Formato de tarefas inválido'] } }
  }

  if (!tasks.length) return { errors: { tasks: ['Adicione ao menos uma tarefa'] } }

  try {
    const result = await apiServer.post<{ templateId: string }>('/api/v1/task-templates', {
      name: name.trim(),
      tasks,
    })
    revalidatePath('/task-templates')
    return { success: true, templateId: result.templateId }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

// ─── Create from task IDs ─────────────────────────────────────

export async function createTemplateFromTasks(name: string, taskIds: string[]) {
  try {
    const result = await apiServer.post<{ templateId: string }>('/api/v1/task-templates/from-tasks', {
      name,
      taskIds,
    })
    revalidatePath('/task-templates')
    return { templateId: result.templateId }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

// ─── Apply ────────────────────────────────────────────────────

export async function applyTemplate(templateId: string, customerId: string) {
  try {
    const result = await apiServer.post<{ taskIds: string[] }>(
      `/api/v1/task-templates/${templateId}/apply/${customerId}`,
      {},
    )
    revalidatePath(`/customers/${customerId}/tasks`)
    return { taskIds: result.taskIds }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

// ─── Delete ───────────────────────────────────────────────────

export async function deleteTemplate(templateId: string) {
  try {
    await apiServer.delete(`/api/v1/task-templates/${templateId}`)
    revalidatePath('/task-templates')
  } catch (err) {
    return { message: (err as Error).message }
  }
}
