'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Task, TaskStatus } from '@/lib/definitions'

const STATUS_CLASS: Record<TaskStatus, string> = {
  idea_could:  'bg-purple-100 text-purple-700',
  idea_should: 'bg-violet-100 text-violet-700',
  backlog:     'bg-slate-100  text-slate-600',
  todo:        'bg-blue-100   text-blue-700',
  in_progress: 'bg-amber-100  text-amber-700',
  review:      'bg-indigo-100 text-indigo-700',
  done:        'bg-green-100  text-green-700',
  cancelled:   'bg-red-100    text-red-600',
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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <button
          onClick={prev}
          className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500"
          aria-label="Mês anterior"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-slate-900">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={next}
          className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500"
          aria-label="Próximo mês"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-slate-500">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="min-h-[90px] border-b border-r border-slate-100 bg-slate-50/50" />
          }

          const cellDate = new Date(year, month, day)
          const isToday = sameDay(cellDate, today)
          const dayTasks = tasks.filter((t) => taskFallsOnDay(t, cellDate))

          return (
            <div
              key={day}
              className={`min-h-[90px] border-b border-r border-slate-100 p-1.5 ${
                isToday ? 'bg-indigo-50/60' : ''
              } ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}`}
            >
              <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                isToday
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500'
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
                  <span className="text-[10px] text-slate-400">+{dayTasks.length - 3} mais</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
