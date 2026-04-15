'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Task, TaskStatus } from '@/lib/definitions'

const STATUS_CLASS: Record<TaskStatus, string> = {
  idea_could:  'bg-purple-500/15 text-purple-400',
  idea_should: 'bg-violet-100 text-violet-400',
  backlog:     'bg-elevated  text-md',
  todo:        'bg-blue-500/15   text-blue-400',
  in_progress: 'bg-amber-500/15  text-amber-400',
  review:      'bg-indigo-100 text-indigo-400',
  done:        'bg-green-500/15  text-green-400',
  cancelled:   'bg-red-500/15    text-red-400',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  // 0=Sun, adjust so Mon=0
  return (new Date(year, month, 1).getDay() + 6) % 7
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function taskFallsOnDay(task: Task, day: Date): boolean {
  if (task.startAt) {
    const s = new Date(task.startAt)
    const e = task.endAt ? new Date(task.endAt) : s
    return day >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) &&
      day <= new Date(e.getFullYear(), e.getMonth(), e.getDate())
  }
  if (task.endAt) {
    return sameDay(new Date(task.endAt), day)
  }
  return false
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type Props = { tasks: Task[]; customerId: string }

export default function CalendarView({ tasks, customerId }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = getFirstDayOfWeek(year, month)

  // build grid: leading empty cells + day cells
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          onClick={prev}
          className="rounded-lg p-1.5 hover:bg-elevated text-md"
          aria-label="Mês anterior"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-hi">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={next}
          className="rounded-lg p-1.5 hover:bg-elevated text-md"
          aria-label="Próximo mês"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-md">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="min-h-[90px] border-b border-r border-border bg-canvas/50" />
          }

          const cellDate = new Date(year, month, day)
          const isToday = sameDay(cellDate, today)
          const dayTasks = tasks.filter((t) => taskFallsOnDay(t, cellDate))

          return (
            <div
              key={day}
              className={`min-h-[90px] border-b border-r border-border p-1.5 ${
                isToday ? 'bg-indigo-500/10/60' : ''
              } ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}`}
            >
              <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                isToday
                  ? 'btn-brand text-white'
                  : 'text-md'
              }`}>
                {day}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <Link
                    key={t.id}
                    href={`/customers/${customerId}/tasks/${t.id}`}
                    className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${STATUS_CLASS[t.status]} hover:opacity-80`}
                    title={t.title}
                  >
                    {t.title}
                  </Link>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-lo">+{dayTasks.length - 3} mais</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
