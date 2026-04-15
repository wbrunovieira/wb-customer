'use client'

import { useState, useTransition, useRef } from 'react'
import { sendEmail } from '@/app/actions/communications'
import { useToast } from '@/components/toast/toast-context'

type AttachmentFile = { fileName: string; mimeType: string; base64: string; sizeKb: number }

async function fileToBase64(file: File): Promise<AttachmentFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve({
        fileName: file.name,
        mimeType: file.type,
        base64: dataUrl.split(',')[1],
        sizeKb: Math.round(file.size / 1024),
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface EmailLinkProps {
  email: string
  customerId: string
  className?: string
}

export function EmailLink({ email, customerId, className }: EmailLinkProps) {
  const { success, error } = useToast()
  const [open, setOpen] = useState(false)
  const [sending, startSend] = useTransition()
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const subject = (form.elements.namedItem('subject') as HTMLInputElement).value
    const body = (form.elements.namedItem('body') as HTMLTextAreaElement).value
    if (!subject || !body) return

    startSend(async () => {
      const res = await sendEmail(customerId, {
        to: [email],
        subject,
        htmlBody: `<div style="font-family:sans-serif;white-space:pre-wrap">${body}</div>`,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
      if (res.ok) {
        success('E-mail enviado')
        setOpen(false)
        setAttachments([])
      } else {
        error(res.message ?? 'Erro ao enviar e-mail')
      }
    })
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 text-accent hover:underline ${className ?? ''}`}
        title={`Escrever e-mail para ${email}`}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        {email}
      </button>

      {open && (
        <form
          onSubmit={handleSend}
          className="mt-1 flex flex-col gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-lo">Para: <span className="text-hi">{email}</span></span>
            <button
              type="button"
              onClick={() => { setOpen(false); setAttachments([]) }}
              className="text-xs text-lo hover:text-hi"
            >
              ×
            </button>
          </div>

          <input
            name="subject"
            required
            placeholder="Assunto *"
            className="rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-hi focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
          />

          <textarea
            name="body"
            rows={4}
            required
            placeholder="Mensagem *"
            className="rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
          />

          {/* Attachments */}
          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? [])
                const converted = await Promise.all(files.map(fileToBase64))
                setAttachments((prev) => [...prev, ...converted])
                e.target.value = ''
              }}
            />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {attachments.map((att, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-xs text-md ring-1 ring-inset ring-border"
                  >
                    {att.fileName} <span className="text-lo">({att.sizeKb}kb)</span>
                    <button type="button" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))} className="text-lo hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="self-start flex items-center gap-1 text-xs text-lo hover:text-md"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              Anexar
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-1.5 rounded-lg btn-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      )}
    </span>
  )
}
