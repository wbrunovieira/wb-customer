'use client'

import { useTransition, useState, useRef, useEffect } from 'react'
import {
  addComment,
  addCommentAttachment,
  createAudioComment,
  resolveComment,
  reactToComment,
  deleteComment,
} from '@/app/actions/tasks'
import { TaskComment } from '@/lib/definitions'
import ImageAnnotationViewer from './image-annotation-viewer'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🚀', '👀', '✅']

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

type Props = {
  customerId: string
  taskId: string
  comments: TaskComment[]
  currentUserId: string
}

// ─── Audio Recorder ───────────────────────────────────────────

function AudioRecorder({
  onAudioReady,
  disabled,
}: {
  onAudioReady: (blob: Blob) => void
  disabled: boolean
}) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        onAudioReady(blob)
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        setSeconds(0)
      }

      mr.start()
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      alert('Microfone não disponível')
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  if (!recording) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={startRecording}
        title="Gravar áudio"
        className="rounded-lg p-1.5 text-lo hover:bg-elevated hover:text-md disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-2 py-1 ring-1 ring-red-200">
      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500/100" />
      <span className="text-xs font-medium text-red-400">
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </span>
      <button
        type="button"
        onClick={stopRecording}
        className="rounded px-2 py-0.5 text-xs font-medium text-red-400 hover:bg-red-500/15"
      >
        Parar
      </button>
    </div>
  )
}

// ─── Add comment form ─────────────────────────────────────────

function AddCommentForm({
  customerId,
  taskId,
  parentId,
  placeholder = 'Escreva um comentário...',
  onSuccess,
}: {
  customerId: string
  taskId: string
  parentId?: string
  placeholder?: string
  onSuccess?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleAudioReady(blob: Blob) {
    startTransition(async () => {
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      const result = await createAudioComment(customerId, taskId, fd)
      if ('message' in result) setError(result.message)
      else onSuccess?.()
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = textareaRef.current?.value?.trim() || null

    if (!body && !file) {
      setError('Escreva algo ou anexe um arquivo')
      return
    }

    startTransition(async () => {
      setError(null)
      const result = await addComment(customerId, taskId, body, parentId)

      if ('message' in result) {
        setError(result.message)
        return
      }

      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        try {
          await addCommentAttachment(customerId, taskId, result.commentId, fd)
        } catch {
          // comment was created; attachment failure is non-fatal
        }
      }

      if (textareaRef.current) textareaRef.current.value = ''
      setFile(null)
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        ref={textareaRef}
        rows={2}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1// resize-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* File preview */}
      {file && (
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-2 py-1">
          <span className="text-xs text-md truncate flex-1">📎 {file.name}</span>
          <button
            type="button"
            onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
            className="text-lo hover:text-red-500 text-sm"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {/* File attach */}
          <button
            type="button"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
            title="Anexar arquivo"
            className="rounded-lg p-1.5 text-lo hover:bg-elevated hover:text-md disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {/* Audio recorder */}
          <AudioRecorder onAudioReady={handleAudioReady} disabled={pending} />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg btn-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? '...' : parentId ? 'Responder' : 'Comentar'}
        </button>
      </div>
    </form>
  )
}

// ─── Reaction bar ─────────────────────────────────────────────

function ReactionBar({
  customerId,
  taskId,
  comment,
  currentUserId,
}: {
  customerId: string
  taskId: string
  comment: TaskComment
  currentUserId: string
}) {
  const [pending, startTransition] = useTransition()
  const [showPicker, setShowPicker] = useState(false)

  const grouped = new Map<string, string[]>()
  for (const r of comment.reactions) {
    if (!grouped.has(r.emoji)) grouped.set(r.emoji, [])
    grouped.get(r.emoji)!.push(r.userId)
  }

  function toggle(emoji: string) {
    const mine = grouped.get(emoji)?.includes(currentUserId) ?? false
    startTransition(() => reactToComment(customerId, taskId, comment.id, emoji, !mine))
    setShowPicker(false)
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 relative">
      {[...grouped.entries()].map(([emoji, users]) => {
        const mine = users.includes(currentUserId)
        return (
          <button
            key={emoji}
            disabled={pending}
            onClick={() => toggle(emoji)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset transition-colors disabled:opacity-50 ${
              mine
                ? 'bg-indigo-500/10 text-indigo-400 ring-indigo-600/20'
                : 'bg-canvas text-md ring-slate-200 hover:ring-slate-300'
            }`}
          >
            {emoji} {users.length}
          </button>
        )
      })}

      <div className="relative">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="rounded-full px-2 py-0.5 text-xs text-lo ring-1 ring-inset ring-slate-200 hover:ring-slate-300 hover:text-md"
        >
          + 😊
        </button>
        {showPicker && (
          <div className="absolute left-0 top-7 z-10 flex gap-1 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => toggle(e)}
                className="rounded px-1 py-0.5 text-sm hover:bg-elevated"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Single comment ───────────────────────────────────────────

function CommentItem({
  comment,
  customerId,
  taskId,
  currentUserId,
  depth = 0,
}: {
  comment: TaskComment
  customerId: string
  taskId: string
  currentUserId: string
  depth?: number
}) {
  const [showReply, setShowReply] = useState(false)
  const [pending, startTransition] = useTransition()

  const isDeleted = comment.body === null && comment.audioUrl === null && comment.attachments.length === 0
  const isAuthor = comment.authorUserId === currentUserId

  const imageAttachments = comment.attachments.filter((a) => IMAGE_MIMES.includes(a.mimeType))
  const otherAttachments = comment.attachments.filter((a) => !IMAGE_MIMES.includes(a.mimeType))

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-border pl-4' : ''}`}>
      <div
        className={`rounded-lg p-3 ${
          comment.resolved ? 'bg-green-500/10 border border-green-100' : 'bg-surface border border-border'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-400">
              {comment.authorUserId.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-xs text-md">
              {new Date(comment.createdAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {comment.resolved && (
              <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
                Resolvido
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!comment.resolved && depth === 0 && (
              <button
                disabled={pending}
                onClick={() => startTransition(() => resolveComment(customerId, taskId, comment.id))}
                className="text-xs text-lo hover:text-green-400 disabled:opacity-50"
              >
                Resolver
              </button>
            )}
            {isAuthor && !isDeleted && (
              <button
                disabled={pending}
                onClick={() =>
                  startTransition(() => deleteComment(customerId, taskId, comment.id))
                }
                className="text-xs text-lo hover:text-red-400 disabled:opacity-50"
                aria-label="Excluir comentário"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {isDeleted ? (
          <p className="text-sm italic text-lo">Comentário excluído.</p>
        ) : (
          <>
            {comment.body && (
              <p className="text-sm text-hi whitespace-pre-wrap">{comment.body}</p>
            )}

            {/* Audio */}
            {comment.audioUrl && (
              <audio controls src={comment.audioUrl} className="mt-2 w-full h-8" />
            )}

            {/* Image attachments with annotation overlay */}
            {imageAttachments.map((att) => {
              const attAnnotations = comment.annotations.filter((a) => a.imageUrl === att.url)
              return (
                <ImageAnnotationViewer
                  key={att.id}
                  customerId={customerId}
                  taskId={taskId}
                  commentId={comment.id}
                  imageUrl={att.url}
                  annotations={attAnnotations}
                />
              )
            })}

            {/* Other attachments */}
            {otherAttachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {otherAttachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-md hover:border-indigo-300 hover:text-indigo-600"
                  >
                    📎 {att.name}
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {/* Reactions */}
        {!isDeleted && (
          <ReactionBar
            customerId={customerId}
            taskId={taskId}
            comment={comment}
            currentUserId={currentUserId}
          />
        )}

        {/* Reply button */}
        {!isDeleted && depth === 0 && (
          <button
            onClick={() => setShowReply((v) => !v)}
            className="mt-1.5 text-xs text-lo hover:text-indigo-600"
          >
            Responder
          </button>
        )}

        {showReply && (
          <div className="mt-2">
            <AddCommentForm
              customerId={customerId}
              taskId={taskId}
              parentId={comment.id}
              placeholder="Escreva uma resposta..."
              onSuccess={() => setShowReply(false)}
            />
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              customerId={customerId}
              taskId={taskId}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────

export default function CommentsSection({ customerId, taskId, comments, currentUserId }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-hi">
          Comentários
          {comments.length > 0 && (
            <span className="ml-2 text-xs font-normal text-lo">{comments.length}</span>
          )}
        </h3>
      </div>

      {comments.length > 0 ? (
        <div className="mb-4 flex flex-col gap-3">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              customerId={customerId}
              taskId={taskId}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ) : (
        <p className="mb-4 text-xs text-lo">Nenhum comentário ainda.</p>
      )}

      <AddCommentForm customerId={customerId} taskId={taskId} />
    </div>
  )
}
