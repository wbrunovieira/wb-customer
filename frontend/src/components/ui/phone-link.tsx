import React from 'react'

interface PhoneLinkProps {
  phone: string
  className?: string
}

function sanitizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) return `+55${digits.slice(1)}`
  if (!digits.startsWith('+')) return `+${digits}`
  return digits
}

export function PhoneLink({ phone, className }: PhoneLinkProps) {
  const href = `tel:${sanitizePhone(phone)}`
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1 text-accent hover:underline ${className ?? ''}`}
      title={`Ligar para ${phone} via GoTo`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
      {phone}
    </a>
  )
}
