'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, apiServer } from '@/lib/api-server'
import {
  ContentViolation,
  CustomerSocialChannels,
  PublishedPost,
  SocialGroupView,
} from '@/lib/definitions'

function revalidateSocial(customerId: string) {
  revalidatePath(`/customers/${customerId}/social`)
  revalidatePath(`/customers/${customerId}`)
}

/**
 * Grupos do motor com o vínculo já resolvido.
 *
 * Devolve o erro em vez de estourar: sem POSTIZ_API_URL/POSTIZ_API_KEY o
 * backend responde 503 com uma mensagem que diz o que falta, e essa mensagem é
 * mais útil na tela do que uma página de erro.
 */
export async function listSocialGroups(): Promise<{
  groups?: SocialGroupView[]
  message?: string
}> {
  try {
    const res = await apiServer.get<{ groups: SocialGroupView[] }>(
      '/api/v1/social/groups',
    )
    return { groups: res.groups }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function getCustomerSocialChannels(customerId: string): Promise<{
  data?: CustomerSocialChannels
  message?: string
}> {
  try {
    const data = await apiServer.get<CustomerSocialChannels>(
      `/api/v1/customers/${customerId}/social/channels`,
    )
    return { data }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

/** groupId null desfaz o vínculo. */
export async function linkSocialGroup(
  customerId: string,
  groupId: string | null,
): Promise<{ groupName?: string | null; message?: string }> {
  try {
    const res = await apiServer.put<{
      customerId: string
      postizGroupId: string | null
      groupName: string | null
    }>(`/api/v1/customers/${customerId}/social/group`, { groupId })
    revalidateSocial(customerId)
    return { groupName: res.groupName }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

/** Confere o texto contra as regras da casa, sem publicar nada. */
export async function validateSocialContent(content: string): Promise<{
  ok?: boolean
  violations?: ContentViolation[]
  message?: string
}> {
  try {
    const res = await apiServer.post<{ ok: boolean; violations: ContentViolation[] }>(
      '/api/v1/social/validate',
      { content },
    )
    return { ok: res.ok, violations: res.violations }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

/**
 * Publica ou agenda. O 422 do validador volta com as violações intactas — sem
 * isso a tela só poderia dizer "texto inválido" e deixar a pessoa adivinhando.
 */
export async function publishSocialPost(
  customerId: string,
  data: {
    content: string
    channelIds: string[]
    mode: 'now' | 'schedule'
    scheduledFor?: string
    creativeId?: string | null
    attributionLinkId?: string | null
  },
): Promise<{ post?: PublishedPost; violations?: ContentViolation[]; message?: string }> {
  try {
    const post = await apiServer.post<PublishedPost>(
      `/api/v1/customers/${customerId}/social/publications`,
      data,
    )
    revalidateSocial(customerId)
    return { post }
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      const body = err.body as { violations?: ContentViolation[] }
      return { message: err.message, violations: body.violations ?? [] }
    }
    return { message: (err as Error).message }
  }
}
