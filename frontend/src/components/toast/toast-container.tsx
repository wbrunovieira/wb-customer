'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Toast, useToast } from './toast-context'

// ─── Icons ───────────────────────────────────────────────────

function SuccessIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// ─── Theme ───────────────────────────────────────────────────

const THEME = {
  success: {
    bg: 'bg-white',
    border: 'border-green-200',
    icon: 'text-green-500',
    bar: 'bg-green-400',
    IconComponent: SuccessIcon,
  },
  error: {
    bg: 'bg-white',
    border: 'border-red-200',
    icon: 'text-red-500',
    bar: 'bg-red-400',
    IconComponent: ErrorIcon,
  },
  info: {
    bg: 'bg-white',
    border: 'border-indigo-200',
    icon: 'text-indigo-500',
    bar: 'bg-indigo-400',
    IconComponent: InfoIcon,
  },
  confirm: {
    bg: 'bg-white',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    bar: '',
    IconComponent: WarningIcon,
  },
}

// ─── Progress bar ─────────────────────────────────────────────

function ProgressBar({ duration, color }: { duration: number; color: string }) {
  return (
    <motion.div
      className={`absolute bottom-0 left-0 h-0.5 rounded-b-xl ${color}`}
      initial={{ width: '100%' }}
      animate={{ width: '0%' }}
      transition={{ duration: duration / 1000, ease: 'linear' }}
    />
  )
}

// ─── Single toast ─────────────────────────────────────────────

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast()
  const theme = THEME[toast.type]
  const Icon = theme.IconComponent
  const duration = toast.type === 'error' ? 5000 : 3500

  function handleConfirm() {
    toast.onConfirm?.()
    dismiss(toast.id)
  }

  function handleCancel() {
    toast.onCancel?.()
    dismiss(toast.id)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative w-80 overflow-hidden rounded-xl border ${theme.border} ${theme.bg} shadow-lg shadow-slate-900/5`}
    >
      <div className="flex items-start gap-3 p-4">
        <span className={`mt-0.5 shrink-0 ${theme.icon}`}>
          <Icon />
        </span>

        <p className="flex-1 text-sm font-medium leading-snug text-slate-800">
          {toast.message}
        </p>

        {toast.type !== 'confirm' && (
          <button
            onClick={() => dismiss(toast.id)}
            className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-700"
            aria-label="Fechar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {toast.type === 'confirm' && (
        <div className="flex gap-2 border-t border-slate-100 px-4 pb-3 pt-2">
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 active:scale-95"
          >
            {toast.confirmLabel}
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 active:scale-95"
          >
            {toast.cancelLabel}
          </button>
        </div>
      )}

      {toast.type !== 'confirm' && theme.bar && (
        <ProgressBar duration={duration} color={theme.bar} />
      )}
    </motion.div>
  )
}

// ─── Container ───────────────────────────────────────────────

export default function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
      <AnimatePresence mode="sync">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
