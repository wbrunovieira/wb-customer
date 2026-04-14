'use client'

import { useActionState, useTransition, useState } from 'react'
import { addComment, replyToComment, resolveComment, reactToComment, deleteComment } from '@/app/actions/tasks'
import { TaskComment } from '@/lib/definitions'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🚀', '👀', '✅']

type Props = {
  customerId: string
  taskId: string
  comments: TaskComment[]
  currentUserId: string
}

// ─── Add comment form ─────────────────────────────────────────

function AddCommentForm({ customerId, taskId }: { customerId: string; taskId: string }) {
  const action = addComment.bind(null, customerId, taskId)
  const [state, formAction, pending] = useActionState(action, undefined)
  const errors = (state as { errors?: { body?: string[] } } | undefined)?.errors

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <textarea
        name="body"
        rows={2}
        placeholder="Escreva um comentário..."
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
      />
      {errors?.body && <p className="text-xs text-red-600">{errors.body[0]}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? '...' : 'Comentar'}
        </button>
      </div>
    </form>
  )
}

// ─── Reply form ───────────────────────────────────────────────

function ReplyForm({
  customerId,
  taskId,
  parentId,
  onCancel,
}: {
  customerId: string
  taskId: string
  parentId: string
  onCancel: () => void
}) {
  const action = replyToComment.bind(null, customerId, taskId, parentId)
  const [state, formAction, pending] = useActionState(action, undefined)
  const errors = (state as { errors?: { body?: string[] } } | undefined)?.errors

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-1.5">
      <textarea
        name="body"
        rows={2}
        placeholder="Escreva uma resposta..."
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
      />
      {errors?.body && <p className="text-xs text-red-600">{errors.body[0]}</p>}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? '...' : 'Responder'}
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

  // Group reactions by emoji
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
                ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
                : 'bg-slate-50 text-slate-600 ring-slate-200 hover:ring-slate-300'
            }`}
          >
            {emoji} {users.length}
          </button>
        )
      })}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="rounded-full px-2 py-0.5 text-xs text-slate-400 ring-1 ring-inset ring-slate-200 hover:ring-slate-300 hover:text-slate-600"
        >
          + 😊
        </button>
        {showPicker && (
          <div className="absolute left-0 top-7 z-10 flex gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => toggle(e)}
                className="rounded px-1 py-0.5 text-sm hover:bg-slate-100"
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

  const isDeleted = comment.body === null && comment.audioUrl === null
  const isAuthor = comment.authorUserId === currentUserId

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-slate-100 pl-4' : ''}`}>
      <div
        className={`rounded-lg p-3 ${
          comment.resolved ? 'bg-green-50 border border-green-100' : 'bg-white border border-slate-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {comment.authorUserId.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-xs text-slate-500">
              {new Date(comment.createdAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {comment.resolved && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Resolvido
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!comment.resolved && depth === 0 && (
              <button
                disabled={pending}
                onClick={() => startTransition(() => resolveComment(customerId, taskId, comment.id))}
                className="text-xs text-slate-400 hover:text-green-600 disabled:opacity-50"
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
                className="text-xs text-slate-300 hover:text-red-400 disabled:opacity-50"
                aria-label="Excluir comentário"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {isDeleted ? (
          <p className="text-sm italic text-slate-400">Comentário excluído.</p>
        ) : (
          <>
            {comment.body && (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.body}</p>
            )}
            {comment.audioUrl && (
              <audio controls src={comment.audioUrl} className="mt-2 w-full h-8" />
            )}
            {comment.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {comment.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
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
            className="mt-1.5 text-xs text-slate-400 hover:text-indigo-600"
          >
            Responder
          </button>
        )}

        {showReply && (
          <ReplyForm
            customerId={customerId}
            taskId={taskId}
            parentId={comment.id}
            onCancel={() => setShowReply(false)}
          />
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
        <h3 className="text-sm font-semibold text-slate-700">
          Comentários
          {comments.length > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-400">{comments.length}</span>
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
        <p className="mb-4 text-xs text-slate-400">Nenhum comentário ainda.</p>
      )}

      <AddCommentForm customerId={customerId} taskId={taskId} />
    </div>
  )
}
