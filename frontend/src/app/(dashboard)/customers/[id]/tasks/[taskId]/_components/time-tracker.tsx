'use client'

import { useState, useEffect, useTransition } from 'react'
import { startTimeTracking, stopTimeTracking } from '@/app/actions/tasks'

function formatDuration(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

type Props = {
  customerId: string
  taskId: string
  trackedSeconds: number
  isActive?: boolean
  activeStartedAt?: string | null
}

export default function TimeTracker({
  customerId,
  taskId,
  trackedSeconds,
  isActive = false,
  activeStartedAt,
}: Props) {
  const [running, setRunning] = useState(isActive)
  const [elapsed, setElapsed] = useState(0)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!running) { setElapsed(0); return }

    const base = activeStartedAt
      ? Math.floor((Date.now() - new Date(activeStartedAt).getTime()) / 1000)
      : 0
    setElapsed(base)

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [running, activeStartedAt])

  function handleStart() {
    setRunning(true)
    startTransition(() => startTimeTracking(customerId, taskId))
  }

  function handleStop() {
    setRunning(false)
    setElapsed(0)
    startTransition(async () => { await stopTimeTracking(customerId, taskId) })
  }

  const totalSecs = trackedSeconds + (running ? elapsed : 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Tempo Rastreado</h2>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {formatDuration(totalSecs)}
          </div>
          {running && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-amber-600">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              Cronômetro ativo
            </div>
          )}
        </div>

        {running ? (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
            Parar
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Iniciar
          </button>
        )}
      </div>

      {running && elapsed > 0 && (
        <div className="mt-2 text-xs text-slate-400">
          Esta sessão: {formatDuration(elapsed)}
        </div>
      )}
    </div>
  )
}
