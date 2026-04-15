'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'

function revalidateStrategies(customerId: string) {
  revalidatePath(`/customers/${customerId}/creatives/strategies`)
}

export async function createStrategy(
  customerId: string,
  data: {
    name: string
    phase: string
    objective?: string
    budget?: number
    durationDays?: number
    startAt?: string
    parentStrategyId?: string
    creativeIds: string[]
    notes?: string
  },
): Promise<{ strategyId?: string; message?: string }> {
  try {
    const res = await apiServer.post<{ strategyId: string }>(
      `/api/v1/customers/${customerId}/creative-strategies`,
      data,
    )
    revalidateStrategies(customerId)
    return { strategyId: res.strategyId }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function updateStrategy(
  customerId: string,
  strategyId: string,
  data: {
    name?: string
    objective?: string
    budget?: number | null
    durationDays?: number | null
    startAt?: string | null
    endAt?: string | null
    winnerId?: string
    status?: string
    notes?: string | null
  },
): Promise<{ message?: string }> {
  try {
    await apiServer.patch(
      `/api/v1/customers/${customerId}/creative-strategies/${strategyId}`,
      data,
    )
    revalidateStrategies(customerId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function deleteStrategy(
  customerId: string,
  strategyId: string,
): Promise<void> {
  await apiServer.delete(
    `/api/v1/customers/${customerId}/creative-strategies/${strategyId}`,
  )
  revalidateStrategies(customerId)
}
