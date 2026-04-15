'use client'

import { useState, useEffect, useRef } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  meta?: Record<string, unknown>
  readAt: number | null
  receivedAt: number
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter((n) => !n.readAt).length

  useEffect(() => {
    const es = new EventSource('/api/events')

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data as string) as Omit<Notification, 'id' | 'readAt' | 'receivedAt'>
        setNotifications((prev) => [
          {
            ...payload,
            id: `${Date.now()}-${Math.random()}`,
            readAt: null,
            receivedAt: Date.now(),
          },
          ...prev.slice(0, 49), // keep last 50
        ])
      } catch {
        // malformed event
      }
    }

    es.onerror = () => {
      // Reconnection is handled automatically by EventSource
    }

    return () => es.close()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: Date.now() })))
  }

  function toggleOpen() {
    setOpen((prev) => {
      if (!prev) {
        // Mark all as read when opening
        setNotifications((ns) => ns.map((n) => ({ ...n, readAt: n.readAt ?? Date.now() })))
      }
      return !prev
    })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-md hover:bg-elevated transition-colors"
        aria-label="Notificações"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/100 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-hi">Notificações</span>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-accent hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-lo">
                Nenhuma notificação.
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-border px-4 py-3 last:border-0 ${!n.readAt ? 'bg-brand/10' : ''}`}
                >
                  <p className="text-sm font-medium text-hi">{n.title}</p>
                  <p className="mt-0.5 text-xs text-md">{n.body}</p>
                  <p className="mt-1 text-xs text-lo">
                    {new Date(n.receivedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
