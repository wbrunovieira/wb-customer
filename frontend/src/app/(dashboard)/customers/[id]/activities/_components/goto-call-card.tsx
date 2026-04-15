'use client'

import { useState } from 'react'
import { Activity } from '@/lib/definitions'

const OUTCOME_LABEL: Record<string, string> = {
  answered: 'Atendida',
  voicemail: 'Caixa postal',
  no_answer: 'Sem resposta',
  busy: 'Ocupado',
  failed: 'Falhou',
}

const OUTCOME_CLASS: Record<string, string> = {
  answered: 'bg-green-500/10 text-green-400 ring-green-500/20',
  voicemail: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  no_answer: 'bg-canvas text-lo ring-border',
  busy: 'bg-red-500/10 text-red-400 ring-red-500/20',
  failed: 'bg-red-500/10 text-red-400 ring-red-500/20',
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}min ${s}s` : `${s}s`
}

export function GoToCallCard({ activity }: { activity: Activity }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  const outcome = activity.gotoCallOutcome
  const duration = activity.gotoDuration
  const audioUrl = activity.gotoRecordingUrl
  const transcript = activity.gotoTranscriptText

  return (
    <div className="mt-3 flex flex-col gap-3">
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {outcome && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${OUTCOME_CLASS[outcome] ?? 'bg-canvas text-lo ring-border'}`}
          >
            {OUTCOME_LABEL[outcome] ?? outcome}
          </span>
        )}
        {duration != null && (
          <span className="text-lo">
            <svg
              className="mr-1 inline"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatDuration(duration)}
          </span>
        )}
      </div>

      {/* Audio player */}
      {audioUrl && (
        <div className="rounded-lg bg-elevated p-2">
          <p className="mb-1.5 text-xs font-medium text-lo">Gravação</p>
          <audio
            controls
            src={audioUrl}
            className="h-8 w-full"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      )}

      {/* Transcription */}
      {transcript && (
        <div className="rounded-lg border border-border bg-canvas">
          <button
            onClick={() => setTranscriptOpen((o) => !o)}
            className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-md hover:text-hi"
          >
            <span className="flex items-center gap-1.5">
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Transcrição
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${transcriptOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {transcriptOpen && (
            <div className="border-t border-border px-3 py-2">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-md">{transcript}</p>
            </div>
          )}
        </div>
      )}

      {/* Pending transcription */}
      {audioUrl && !transcript && (
        <p className="text-xs text-lo">Transcrição em processamento...</p>
      )}
    </div>
  )
}
