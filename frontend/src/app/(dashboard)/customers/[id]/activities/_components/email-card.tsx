'use client'

import { useState, useTransition, useRef } from 'react'
import { Activity } from '@/lib/definitions'
import { sendEmail } from '@/app/actions/communications'
import { useToast } from '@/components/toast/toast-context'

type AttachmentFile = { fileName: string; mimeType: string; base64: string; sizeKb: number }

async function fileToBase64(file: File): Promise<AttachmentFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      resolve({ fileName: file.name, mimeType: file.type, base64, sizeKb: Math.round(file.size / 1024) })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function EmailCard({
  customerId,
  activity,
}: {
  customerId: string
  activity: Activity
}) {
  const { success, error } = useToast()
  const [showCompose, setShowCompose] = useState(false)
  const [sending, startSend] = useTransition()
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isIncoming = !!activity.emailFromAddress
  const needsReply = isIncoming && !activity.emailReplied

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const to = (form.elements.namedItem('to') as HTMLInputElement).value
    const cc = (form.elements.namedItem('cc') as HTMLInputElement).value
    const subject = (form.elements.namedItem('subject') as HTMLInputElement).value
    const body = (form.elements.namedItem('body') as HTMLTextAreaElement).value

    if (!to || !subject || !body) return

    startSend(async () => {
      const res = await sendEmail(customerId, {
        to: to.split(',').map((s) => s.trim()).filter(Boolean),
        cc: cc ? cc.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        subject,
        htmlBody: `<div style="font-family:sans-serif;white-space:pre-wrap">${body}</div>`,
        threadId: activity.emailThreadId ?? undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
      if (res.ok) {
        success('E-mail enviado')
        setShowCompose(false)
        setAttachments([])
      } else {
        error(res.message ?? 'Erro ao enviar e-mail')
      }
    })
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {/* Status badges */}
      <div className="flex items-center gap-2">
        {isIncoming && (
          <span className="inline-flex items-center gap-1 text-xs text-lo">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 11 12 6 7 11" />
              <line x1="12" y1="18" x2="12" y2="6" />
            </svg>
            De: <span className="text-md">{activity.emailFromName || activity.emailFromAddress}</span>
          </span>
        )}
        {needsReply && (
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
            Aguardando resposta
          </span>
        )}
        {isIncoming && activity.emailReplied && (
          <span className="text-xs text-lo">Respondido</span>
        )}
      </div>

      {/* Reply / Compose button */}
      {!showCompose && (
        <button
          onClick={() => setShowCompose(true)}
          className="self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-md hover:bg-elevated"
        >
          {needsReply ? 'Responder' : 'Novo e-mail'}
        </button>
      )}

      {/* Compose form */}
      {showCompose && (
        <form
          onSubmit={handleSend}
          className="flex flex-col gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-lo">Para *</label>
              <input
                name="to"
                defaultValue={needsReply ? (activity.emailFromAddress ?? '') : ''}
                placeholder="email@exemplo.com"
                required
                className="rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-hi focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-lo">CC</label>
              <input
                name="cc"
                placeholder="cc@exemplo.com"
                className="rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-hi focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-lo">Assunto *</label>
            <input
              name="subject"
              defaultValue={needsReply ? `Re: ${activity.emailSubject ?? ''}` : ''}
              required
              className="rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-hi focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-lo">Mensagem *</label>
            <textarea
              name="body"
              rows={4}
              required
              placeholder="Escreva sua mensagem..."
              className="rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
            />
          </div>

          {/* File attachments */}
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
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((att, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-xs text-md ring-1 ring-inset ring-border"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    {att.fileName}
                    <span className="text-lo">({att.sizeKb}kb)</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      className="ml-0.5 text-lo hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="self-start flex items-center gap-1 text-xs text-lo hover:text-md"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              Anexar arquivo
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
            <button
              type="button"
              onClick={() => { setShowCompose(false); setAttachments([]) }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-md hover:bg-elevated"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
