'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, apiServer } from '@/lib/api-server'
import {
  ContentViolation,
  CustomerSocialChannels,
  PublishedPost,
  PostMetrics,
  SocialFeed,
  SocialGroupView,
  SocialQueue,
} from '@/lib/definitions'

function revalidateSocial(customerId: string) {
  revalidatePath(`/customers/${customerId}/social`)
  revalidatePath(`/customers/${customerId}/social/queue`)
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

/** A fila do motor para este cliente, na janela pedida. */
export async function getSocialQueue(
  customerId: string,
  from: string,
  to: string,
): Promise<{ queue?: SocialQueue; message?: string }> {
  try {
    const params = new URLSearchParams({ from, to })
    const queue = await apiServer.get<SocialQueue>(
      `/api/v1/customers/${customerId}/social/queue?${params}`,
    )
    return { queue }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

/**
 * Cancela um post da fila. Irreversível, e atinge todas as redes em que o post
 * foi espelhado — quem chama precisa ter confirmado antes.
 */
export async function cancelSocialPost(
  customerId: string,
  postId: string,
): Promise<{ message?: string }> {
  try {
    await apiServer.delete(
      `/api/v1/customers/${customerId}/social/queue/${encodeURIComponent(postId)}`,
    )
    revalidateSocial(customerId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

/** O que já foi publicado para este cliente, na janela pedida. */
export async function getSocialFeed(
  customerId: string,
  from: string,
  to: string,
): Promise<{ feed?: SocialFeed; message?: string }> {
  try {
    const params = new URLSearchParams({ from, to })
    const feed = await apiServer.get<SocialFeed>(
      `/api/v1/customers/${customerId}/social/feed?${params}`,
    )
    return { feed }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

/**
 * Métrica de um post, sob demanda.
 *
 * Uma chamada por post de propósito: o motor tem teto de 90 requisições por
 * hora, e buscar tudo ao abrir o feed queimaria o teto sozinha.
 */
export async function getPostMetrics(
  customerId: string,
  postId: string,
): Promise<{ metrics?: PostMetrics; message?: string }> {
  try {
    const metrics = await apiServer.get<PostMetrics>(
      `/api/v1/customers/${customerId}/social/posts/${encodeURIComponent(postId)}/metrics`,
    )
    return { metrics }
  } catch (err) {
    return { message: (err as Error).message }
  }
}
