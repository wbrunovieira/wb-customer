'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'
import { CustomerSocialChannels, SocialGroupView } from '@/lib/definitions'

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
