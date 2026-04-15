'use client'

import { useState, useTransition } from 'react'
import { WhatsAppMessage } from '@/lib/definitions'
import { sendWhatsApp } from '@/app/actions/communications'
import { useToast } from '@/components/toast/toast-context'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function AudioTranscript({ msg }: { msg: WhatsAppMessage }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-1">
      {msg.mediaUrl && (
        <audio
          controls
          src={msg.mediaUrl}
          className="h-7 w-48"
          style={{ colorScheme: 'dark' }}
        />
      )}
      {msg.mediaTranscriptText && (
        <div className="mt-1 rounded border border-border bg-canvas">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center gap-1 px-2 py-1 text-xs text-lo hover:text-hi"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Transcrição
          </button>
          {open && (
            <p className="border-t border-border px-2 py-1.5 text-xs text-md">
              {msg.mediaTranscriptText}
            </p>
          )}
        </div>
      )}
      {!msg.mediaTranscriptText && (msg.messageType === 'audioMessage' || msg.messageType === 'videoMessage') && (
        <p className="mt-0.5 text-xs text-lo">Transcrevendo...</p>
      )}
    </div>
  )
}

function MessageBubble({ msg }: { msg: WhatsAppMessage }) {
  const isMe = msg.fromMe
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${
          isMe
            ? 'rounded-br-sm bg-indigo-600 text-white'
            : 'rounded-bl-sm bg-elevated text-hi'
        }`}
      >
        {!isMe && msg.senderName && (
          <p className="mb-0.5 text-xs font-semibold text-accent">{msg.senderName}</p>
        )}
        {msg.text && <p className="break-words leading-snug">{msg.text}</p>}
        {msg.mediaLabel && !msg.text && (
          <p className="text-xs opacity-80">{msg.mediaLabel}</p>
        )}
        {(msg.messageType === 'audioMessage' || msg.messageType === 'videoMessage') && (
          <AudioTranscript msg={msg} />
        )}
        <p className={`mt-1 text-right text-xs ${isMe ? 'text-indigo-200' : 'text-lo'}`}>
          {formatTime(msg.timestamp)}
        </p>
      </div>
    </div>
  )
}

export function WhatsAppCard({
  customerId,
  remoteJid,
  messages,
}: {
  customerId: string
  remoteJid: string
  messages: WhatsAppMessage[]
}) {
  const { success, error } = useToast()
  const [text, setText] = useState('')
  const [sending, startSend] = useTransition()

  // Phone from JID
  const phone = remoteJid.split('@')[0]

  function handleSend() {
    if (!text.trim()) return
    startSend(async () => {
      const res = await sendWhatsApp(customerId, phone, text.trim())
      if (res.ok) {
        setText('')
        success('Mensagem enviada')
      } else {
        error(res.message ?? 'Erro ao enviar mensagem')
      }
    })
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {/* Chat bubbles */}
      {messages.length > 0 && (
        <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto rounded-xl border border-border bg-canvas p-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </div>
      )}

      {/* Reply input */}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Responder via WhatsApp..."
          className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
