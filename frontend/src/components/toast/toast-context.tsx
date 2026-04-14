'use client'

import { createContext, useCallback, useContext, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'confirm'

export type Toast = {
  id: string
  type: ToastType
  message: string
  // confirm-type only
  onConfirm?: () => void
  onCancel?: () => void
  confirmLabel?: string
  cancelLabel?: string
}

type ToastContextValue = {
  toasts: Toast[]
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  confirm: (opts: {
    message: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    onCancel?: () => void
  }) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let counter = 0
function uid() {
  return `toast-${++counter}-${Date.now()}`
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = uid()
    setToasts((prev) => [...prev, { ...toast, id }])

    // Auto-dismiss non-confirm toasts
    if (toast.type !== 'confirm') {
      const delay = toast.type === 'error' ? 5000 : 3500
      setTimeout(() => dismiss(id), delay)
    }

    return id
  }, [dismiss])

  const success = useCallback((message: string) => push({ type: 'success', message }), [push])
  const error = useCallback((message: string) => push({ type: 'error', message }), [push])
  const info = useCallback((message: string) => push({ type: 'info', message }), [push])

  const confirm = useCallback((opts: {
    message: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    onCancel?: () => void
  }) => {
    push({
      type: 'confirm',
      message: opts.message,
      confirmLabel: opts.confirmLabel ?? 'Confirmar',
      cancelLabel: opts.cancelLabel ?? 'Cancelar',
      onConfirm: opts.onConfirm,
      onCancel: opts.onCancel,
    })
  }, [push])

  return (
    <ToastContext.Provider value={{ toasts, success, error, info, confirm, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
