'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'

function revalidateTasks(customerId: string) {
  revalidatePath(`/customers/${customerId}/tasks`)
}

// ─── Tasks ───────────────────────────────────────────────────

export async function createTask(
  customerId: string,
  _state: unknown,
  formData: FormData,
) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const sprintId = formData.get('sprintId') as string
  const status = formData.get('status') as string
  const assigneeUserId = formData.get('assigneeUserId') as string
  const startAt = formData.get('startAt') as string
  const endAt = formData.get('endAt') as string
  const impact = formData.get('impact') as string
  const confidence = formData.get('confidence') as string
  const effort = formData.get('effort') as string
  const estimatedHours = formData.get('estimatedHours') as string

  if (!title?.trim()) return { errors: { title: ['Título obrigatório'] } }

  try {
    await apiServer.post(`/api/v1/customers/${customerId}/tasks`, {
      title: title.trim(),
      description: description || undefined,
      sprintId: sprintId || undefined,
      status: status || 'backlog',
      assigneeUserId: assigneeUserId || undefined,
      startAt: startAt ? new Date(startAt).toISOString() : undefined,
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      impact: impact ? Number(impact) : undefined,
      confidence: confidence ? Number(confidence) : undefined,
      effort: effort ? Number(effort) : undefined,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidateTasks(customerId)
  return { success: true }
}

export async function updateTask(
  customerId: string,
  taskId: string,
  _state: unknown,
  formData: FormData,
) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const sprintId = formData.get('sprintId') as string
  const impact = formData.get('impact') as string
  const confidence = formData.get('confidence') as string
  const effort = formData.get('effort') as string
  const startAt = formData.get('startAt') as string
  const endAt = formData.get('endAt') as string

  try {
    await apiServer.patch(`/api/v1/customers/${customerId}/tasks/${taskId}`, {
      title: title || undefined,
      description: description !== null ? description || null : undefined,
      sprintId: sprintId !== undefined ? sprintId || null : undefined,
      impact: impact ? Number(impact) : impact === '' ? null : undefined,
      confidence: confidence ? Number(confidence) : confidence === '' ? null : undefined,
      effort: effort ? Number(effort) : effort === '' ? null : undefined,
      startAt: startAt ? new Date(startAt).toISOString() : startAt === '' ? null : undefined,
      endAt: endAt ? new Date(endAt).toISOString() : endAt === '' ? null : undefined,
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidateTasks(customerId)
  revalidatePath(`/customers/${customerId}/tasks/${taskId}`)
  return { success: true }
}

export async function moveTaskStatus(customerId: string, taskId: string, status: string) {
  await apiServer.patch(`/api/v1/customers/${customerId}/tasks/${taskId}/status`, { status })
  revalidateTasks(customerId)
  revalidatePath(`/customers/${customerId}/tasks/${taskId}`)
}

export async function deleteTask(customerId: string, taskId: string) {
  await apiServer.delete(`/api/v1/customers/${customerId}/tasks/${taskId}`)
  revalidateTasks(customerId)
}

// ─── Checklist ───────────────────────────────────────────────

export async function addChecklistItem(
  customerId: string,
  taskId: string,
  _state: unknown,
  formData: FormData,
) {
  const text = formData.get('text') as string
  if (!text?.trim()) return { errors: { text: ['Texto obrigatório'] } }

  try {
    await apiServer.post(`/api/v1/customers/${customerId}/tasks/${taskId}/checklist`, {
      text: text.trim(),
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidatePath(`/customers/${customerId}/tasks/${taskId}`)
  return { success: true }
}

export async function toggleChecklistItem(customerId: string, taskId: string, itemId: string) {
  await apiServer.patch(
    `/api/v1/customers/${customerId}/tasks/${taskId}/checklist/${itemId}/toggle`,
    {},
  )
  revalidatePath(`/customers/${customerId}/tasks/${taskId}`)
}

export async function deleteChecklistItem(customerId: string, taskId: string, itemId: string) {
  await apiServer.delete(`/api/v1/customers/${customerId}/tasks/${taskId}/checklist/${itemId}`)
  revalidatePath(`/customers/${customerId}/tasks/${taskId}`)
}

// ─── Sprints ─────────────────────────────────────────────────

export async function createSprint(
  customerId: string,
  _state: unknown,
  formData: FormData,
) {
  const name = formData.get('name') as string
  const startAt = formData.get('startAt') as string
  const endAt = formData.get('endAt') as string

  if (!name?.trim()) return { errors: { name: ['Nome obrigatório'] } }
  if (!startAt) return { errors: { startAt: ['Data de início obrigatória'] } }
  if (!endAt) return { errors: { endAt: ['Data de fim obrigatória'] } }

  try {
    await apiServer.post(`/api/v1/customers/${customerId}/sprints`, {
      name: name.trim(),
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidateTasks(customerId)
  return { success: true }
}

export async function deleteSprint(customerId: string, sprintId: string) {
  await apiServer.delete(`/api/v1/customers/${customerId}/sprints/${sprintId}`)
  revalidateTasks(customerId)
}

// ─── Subtasks ────────────────────────────────────────────────

export async function createSubtask(
  customerId: string,
  parentTaskId: string,
  _state: unknown,
  formData: FormData,
) {
  const title = formData.get('title') as string
  if (!title?.trim()) return { errors: { title: ['Título obrigatório'] } }

  try {
    await apiServer.post(`/api/v1/customers/${customerId}/tasks/${parentTaskId}/subtasks`, {
      title: title.trim(),
      description: (formData.get('description') as string) || undefined,
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidatePath(`/customers/${customerId}/tasks/${parentTaskId}`)
  return { success: true }
}

// ─── Comments ────────────────────────────────────────────────

export async function addComment(
  customerId: string,
  taskId: string,
  _state: unknown,
  formData: FormData,
) {
  const body = formData.get('body') as string
  if (!body?.trim()) return { errors: { body: ['Comentário obrigatório'] } }

  try {
    await apiServer.post(`/api/v1/customers/${customerId}/tasks/${taskId}/comments`, {
      body: body.trim(),
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidatePath(`/customers/${customerId}/tasks/${taskId}`)
  return { success: true }
}

export async function replyToComment(
  customerId: string,
  taskId: string,
  parentId: string,
  _state: unknown,
  formData: FormData,
) {
  const body = formData.get('body') as string
  if (!body?.trim()) return { errors: { body: ['Resposta obrigatória'] } }

  try {
    await apiServer.post(`/api/v1/customers/${customerId}/tasks/${taskId}/comments`, {
      body: body.trim(),
      parentId,
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidatePath(`/customers/${customerId}/tasks/${taskId}`)
  return { success: true }
}

export async function resolveComment(customerId: string, taskId: string, commentId: string) {
  await apiServer.patch(
    `/api/v1/customers/${customerId}/tasks/${taskId}/comments/${commentId}/resolve`,
    {},
  )
  revalidatePath(`/customers/${customerId}/tasks/${taskId}`)
}

export async function reactToComment(
  customerId: string,
  taskId: string,
  commentId: string,
  emoji: string,
  toggle: boolean,
) {
  await apiServer.post(
    `/api/v1/customers/${customerId}/tasks/${taskId}/comments/${commentId}/reactions`,
    { emoji, toggle },
  )
  revalidatePath(`/customers/${customerId}/tasks/${taskId}`)
}

export async function deleteComment(customerId: string, taskId: string, commentId: string) {
  await apiServer.delete(
    `/api/v1/customers/${customerId}/tasks/${taskId}/comments/${commentId}`,
  )
  revalidatePath(`/customers/${customerId}/tasks/${taskId}`)
}

// ─── Tags ────────────────────────────────────────────────────

export async function createTag(customerId: string, name: string, color: string) {
  const result = await apiServer.post<{ tagId: string }>('/api/v1/task-tags', {
    customerId,
    name,
    color,
  })
  revalidateTasks(customerId)
  return result
}

export async function attachTag(customerId: string, taskId: string, tagId: string) {
  await apiServer.post(`/api/v1/customers/${customerId}/tasks/${taskId}/tags/${tagId}`, {})
  revalidatePath(`/customers/${customerId}/tasks/${taskId}`)
}

export async function detachTag(customerId: string, taskId: string, tagId: string) {
  await apiServer.delete(`/api/v1/customers/${customerId}/tasks/${taskId}/tags/${tagId}`)
  revalidatePath(`/customers/${customerId}/tasks/${taskId}`)
}
