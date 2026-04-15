'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Task, TaskStatus } from '@/lib/definitions'

const BAR_COLOR: Record<TaskStatus, string> = {
  idea_could:  '#a78bfa',
  idea_should: '#8b5cf6',
  backlog:     '#94a3b8',
  todo:        '#60a5fa',
  in_progress: '#f59e0b',
  review:      '#818cf8',
  done:        '#34d399',
  cancelled:   '#f87171',
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  idea_could:  'Ideia (could)',
  idea_should: 'Ideia (should)',
  backlog:     'Backlog',
  todo:        'A fazer',
  in_progress: 'Em andamento',
  review:      'Revisão',
  done:        'Concluído',
  cancelled:   'Cancelado',
}

const ROW_HEIGHT = 40
const LABEL_WIDTH = 220
const DAY_WIDTH = 30

type Props = { tasks: Task[]; customerId: string }

function toDateOnly(iso: string): Date {
  const d = new Date(iso)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function GanttView({ tasks, customerId }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; task: Task } | null>(null)

  const datedTasks = useMemo(
    () => tasks.filter((t) => t.startAt || t.endAt),
    [tasks],
  )

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (datedTasks.length === 0) {
      const today = new Date()
      return { minDate: today, maxDate: new Date(today.getTime() + 30 * 86400_000), totalDays: 30 }
    }

    let min = Infinity
    let max = -Infinity
    for (const t of datedTasks) {
      if (t.startAt) min = Math.min(min, toDateOnly(t.startAt).getTime())
      if (t.endAt)   max = Math.max(max, toDateOnly(t.endAt).getTime())
    }
    if (!isFinite(min)) min = max
    if (!isFinite(max)) max = min

    // pad 2 days on each side
    const minD = new Date(min - 2 * 86400_000)
    const maxD = new Date(max + 2 * 86400_000)
    const days = Math.ceil((maxD.getTime() - minD.getTime()) / 86400_000) + 1
    return { minDate: minD, maxDate: maxD, totalDays: days }
  }, [datedTasks])

  function dayOffset(iso: string): number {
    return Math.round((toDateOnly(iso).getTime() - minDate.getTime()) / 86400_000)
  }

  // Build day headers (every 7 days show label)
  const dayHeaders: { offset: number; label: string }[] = []
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(minDate.getTime() + i * 86400_000)
    if (d.getDay() === 1 || i === 0) {
      dayHeaders.push({
        offset: i,
        label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      })
    }
  }

  const totalWidth = totalDays * DAY_WIDTH
  const totalHeight = datedTasks.length * ROW_HEIGHT + 40 // 40 for header

  if (datedTasks.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
        <p className="text-sm text-slate-400">Nenhuma tarefa com data cadastrada para exibir no Gantt.</p>
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayOffset = Math.round((today.getTime() - minDate.getTime()) / 86400_000)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ display: 'flex', minWidth: LABEL_WIDTH + totalWidth }}>
          {/* Label column */}
          <div style={{ width: LABEL_WIDTH, flexShrink: 0 }} className="border-r border-slate-200">
            {/* Header spacer */}
            <div className="h-10 border-b border-slate-200 flex items-center px-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tarefa</span>
            </div>
            {datedTasks.map((t) => (
              <div key={t.id} style={{ height: ROW_HEIGHT }} className="flex items-center border-b border-slate-100 px-3 gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: BAR_COLOR[t.status] }}
                />
                <Link
                  href={`/customers/${customerId}/tasks/${t.id}`}
                  className="truncate text-xs text-slate-700 hover:text-indigo-600"
                  title={t.title}
                >
                  {t.title}
                </Link>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div style={{ position: 'relative', width: totalWidth, flexShrink: 0 }}>
            <svg width={totalWidth} height={totalHeight} style={{ display: 'block' }}>
              {/* Day grid lines */}
              {Array.from({ length: totalDays }).map((_, i) => (
                <line
                  key={i}
                  x1={i * DAY_WIDTH}
                  y1={0}
                  x2={i * DAY_WIDTH}
                  y2={totalHeight}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
              ))}

              {/* Row separators */}
              {datedTasks.map((_, i) => (
                <line
                  key={i}
                  x1={0}
                  y1={40 + i * ROW_HEIGHT}
                  x2={totalWidth}
                  y2={40 + i * ROW_HEIGHT}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
              ))}

              {/* Day headers */}
              {dayHeaders.map(({ offset, label }) => (
                <text
                  key={offset}
                  x={offset * DAY_WIDTH + 2}
                  y={14}
                  fontSize={9}
                  fill="#94a3b8"
                >
                  {label}
                </text>
              ))}

              {/* Header border */}
              <line x1={0} y1={40} x2={totalWidth} y2={40} stroke="#e2e8f0" strokeWidth={1} />

              {/* Today line */}
              {todayOffset >= 0 && todayOffset < totalDays && (
                <>
                  <line
                    x1={todayOffset * DAY_WIDTH}
                    y1={0}
                    x2={todayOffset * DAY_WIDTH}
                    y2={totalHeight}
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  <text x={todayOffset * DAY_WIDTH + 2} y={30} fontSize={8} fill="#6366f1">Hoje</text>
                </>
              )}

              {/* Task bars */}
              {datedTasks.map((t, i) => {
                const startOff = t.startAt ? dayOffset(t.startAt) : (t.endAt ? dayOffset(t.endAt) : 0)
                const endOff   = t.endAt   ? dayOffset(t.endAt)   : startOff
                const x = startOff * DAY_WIDTH
                const width = Math.max((endOff - startOff + 1) * DAY_WIDTH, DAY_WIDTH)
                const y = 40 + i * ROW_HEIGHT + ROW_HEIGHT * 0.2
                const barHeight = ROW_HEIGHT * 0.6

                return (
                  <g key={t.id}>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={barHeight}
                      rx={4}
                      fill={BAR_COLOR[t.status]}
                      opacity={0.85}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, task: t })}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    {width > 50 && (
                      <text
                        x={x + 6}
                        y={y + barHeight * 0.68}
                        fontSize={9}
                        fill="white"
                        style={{ pointerEvents: 'none' }}
                      >
                        {t.title.slice(0, Math.floor(width / 6))}
                        {t.title.length > Math.floor(width / 6) ? '…' : ''}
                      </text>
                    )}
                    {/* Progress overlay */}
                    {t.progress > 0 && (
                      <rect
                        x={x}
                        y={y + barHeight * 0.75}
                        width={width * (t.progress / 100)}
                        height={barHeight * 0.18}
                        rx={2}
                        fill="white"
                        opacity={0.5}
                        style={{ pointerEvents: 'none' }}
                      />
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="font-semibold text-slate-900 mb-1">{tooltip.task.title}</div>
          <div className="text-slate-500">
            {STATUS_LABEL[tooltip.task.status]}
          </div>
          {tooltip.task.startAt && (
            <div className="text-slate-400 mt-0.5">
              Início: {new Date(tooltip.task.startAt).toLocaleDateString('pt-BR')}
            </div>
          )}
          {tooltip.task.endAt && (
            <div className="text-slate-400">
              Prazo: {new Date(tooltip.task.endAt).toLocaleDateString('pt-BR')}
            </div>
          )}
          {tooltip.task.progress > 0 && (
            <div className="text-indigo-600 mt-0.5">{tooltip.task.progress}% concluído</div>
          )}
        </div>
      )}
    </div>
  )
}
