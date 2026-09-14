'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ContentViolation, Creative, SocialChannel } from '@/lib/definitions'
import { publishSocialPost, validateSocialContent } from '@/app/actions/social'
import { useToast } from '@/components/toast/toast-context'
import LoadingDots from '@/components/ui/loading-dots'
import { localInputToISO, timezoneLabel } from '@/lib/timezone'
import CreativePicker from '../../../traffic/_components/creative-picker'
import ChannelBadge from '../../_components/channel-badge'

/**
 * Limite de caracteres por rede. Contar contra o menor limite entre as redes
 * escolhidas é o que evita escrever 3.000 caracteres e descobrir no envio que
 * o Instagram corta em 2.200.
 */
const LIMITS: Record<string, number> = {
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  tiktok: 2200,
  youtube: 5000,
  threads: 500,
}

const DEFAULT_LIMIT = 2200

/** O motor recusa qualquer outro formato; barrar aqui evita descobrir no envio. */
const SUPPORTED_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4']

interface Props {
  customerId: string
  channels: SocialChannel[]
}

export default function PostComposer({ customerId, channels }: Props) {
  const { success, error: toastError } = useToast()
  const router = useRouter()
  const [isPublishing, startPublishing] = useTransition()
  const [isChecking, startChecking] = useTransition()

  const [selected, setSelected] = useState<string[]>([])
  const [content, setContent] = useState('')
  const [creative, setCreative] = useState<Creative | null>(null)
  const [mode, setMode] = useState<'now' | 'schedule'>('schedule')
  const [scheduledFor, setScheduledFor] = useState('')
  const [violations, setViolations] = useState<ContentViolation[] | null>(null)

  const publishable = channels.filter((c) => !c.disabled)

  const limit = useMemo(() => {
    const picked = channels.filter((c) => selected.includes(c.id))
    if (picked.length === 0) return null
    return Math.min(...picked.map((c) => LIMITS[c.provider] ?? DEFAULT_LIMIT))
  }, [channels, selected])

  const overLimit = limit !== null && content.length > limit
  // Criativo sem arquivo, ou em formato recusado, trava o envio: o backend
  // responderia 409/415, e descobrir isso depois do clique é tarde.
  const mediaSupported =
    !creative?.mimeType || SUPPORTED_MIME.includes(creative.mimeType)
  const mediaBlocked = !!creative && (!creative.driveFileId || !mediaSupported)
  const blocking = violations?.some((v) => v.severity === 'block') ?? false
  const busy = isPublishing || isChecking

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function handleCreative(_id: string | null, picked: Creative | null) {
    setCreative(picked)
    // A legenda do criativo é ponto de partida, não imposição: só preenche
    // enquanto ninguém escreveu nada, para não apagar texto já digitado.
    if (picked?.caption && content.trim() === '') setContent(picked.caption)
  }

  function handleCheck() {
    if (!content.trim()) return
    startChecking(async () => {
      const res = await validateSocialContent(content)
      if (res.message) {
        toastError(res.message)
        return
      }
      setViolations(res.violations ?? [])
      if (res.ok) success('Texto passa nas regras da casa.')
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (selected.length === 0) {
      toastError('Escolha ao menos um canal.')
      return
    }
    if (mode === 'schedule' && !scheduledFor) {
      toastError('Escolha a data e a hora do agendamento.')
      return
    }

    startPublishing(async () => {
      const res = await publishSocialPost(customerId, {
        content,
        channelIds: selected,
        mode,
        // Lido como horário de São Paulo, não do navegador: quem agenda de
        // outro fuso marcaria outra hora, sem erro e sem aviso.
        scheduledFor: mode === 'schedule' ? localInputToISO(scheduledFor) : undefined,
        creativeId: creative?.id ?? null,
      })

      if (res.violations) {
        setViolations(res.violations)
        toastError('O texto fere as regras da casa. Veja os trechos apontados.')
        return
      }
      if (res.message) {
        toastError(res.message)
        return
      }

      const count = res.post?.targets.length ?? 0
      success(
        mode === 'now'
          ? `Publicado em ${count} canal${count > 1 ? 'is' : ''}.`
          : `Agendado em ${count} canal${count > 1 ? 'is' : ''}.`,
      )
      router.push(`/customers/${customerId}/social`)
      router.refresh()
    })
  }

  const inputCls =
    'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* ── Criativo ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-hi">Criativo</h2>
          <p className="mt-1 text-xs text-lo">
            Opcional. Serve para escrever a legenda a partir dele e registrar de onde
            o post veio.
          </p>
        </div>

        <CreativePicker
          customerId={customerId}
          value={creative?.id ?? null}
          onChange={handleCreative}
          selectedCreative={creative}
        />

        {creative && !creative.driveFileId && (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
            Este criativo ainda não tem arquivo enviado. Envie a arte na tela de
            criativos, ou publique só com texto escolhendo outro.
          </p>
        )}

        {creative?.driveFileId && !mediaSupported && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
            Formato {creative.mimeType ?? 'desconhecido'} não é aceito nas redes.
            Use PNG, JPEG, GIF, WEBP ou MP4.
          </p>
        )}

        {creative?.driveFileId && mediaSupported && (
          <p className="rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-md">
            A arte vai junto com o post e fica registrada como procedência.
          </p>
        )}
      </div>

      {/* ── Texto ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-hi">Legenda</h2>
          <span
            className={`text-xs ${overLimit ? 'text-red-400' : 'text-lo'}`}
            aria-live="polite"
          >
            {content.length}
            {limit !== null && ` / ${limit}`}
          </span>
        </div>

        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            // Violação de um texto que já mudou é ruído; some ao editar.
            if (violations) setViolations(null)
          }}
          onBlur={handleCheck}
          rows={7}
          disabled={busy}
          placeholder="Escreva o post. As regras da casa são conferidas ao sair do campo."
          className={inputCls}
        />

        {limit !== null && (
          <p className="text-xs text-lo">
            O limite mostrado é o da rede mais restritiva entre as escolhidas.
          </p>
        )}

        {violations && violations.length === 0 && (
          <p className="text-xs text-green-400">Nenhuma violação encontrada.</p>
        )}

        {violations && violations.length > 0 && (
          <ul className="flex flex-col gap-2">
            {violations.map((v, i) => (
              <li
                key={`${v.ruleId}-${i}`}
                className={`rounded-lg border px-3 py-2 ${
                  v.severity === 'block'
                    ? 'border-red-500/20 bg-red-500/5'
                    : 'border-amber-500/20 bg-amber-500/5'
                }`}
              >
                <p
                  className={`text-xs font-medium ${
                    v.severity === 'block' ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  {v.severity === 'block' ? 'Bloqueia' : 'Atenção'} — {v.message}
                </p>
                <p className="mt-1 text-xs text-md">
                  “{v.excerpt}” <span className="text-lo">(posição {v.index})</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Canais ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-hi">Onde publicar</h2>
          <p className="mt-1 text-xs text-lo">
            Marcar várias redes manda o mesmo post para todas de uma vez.
          </p>
        </div>

        <ul className="flex flex-col divide-y divide-border">
          {channels.map((channel) => (
            <li key={channel.id} className="flex items-center gap-3 py-3">
              <input
                id={`ch-${channel.id}`}
                type="checkbox"
                checked={selected.includes(channel.id)}
                onChange={() => toggle(channel.id)}
                disabled={channel.disabled || busy}
                className="h-4 w-4 rounded border-border bg-canvas accent-accent disabled:opacity-40"
              />
              <label
                htmlFor={`ch-${channel.id}`}
                className={`flex flex-1 items-center gap-3 text-sm ${
                  channel.disabled ? 'text-lo' : 'text-hi cursor-pointer'
                }`}
              >
                <ChannelBadge provider={channel.provider} />
                {channel.name}
              </label>
              {channel.disabled && (
                <span className="text-xs text-amber-400">desativado — não publica</span>
              )}
            </li>
          ))}
        </ul>

        {publishable.length === 0 && (
          <p className="text-xs text-amber-400">
            Nenhum canal disponível para publicar.
          </p>
        )}
      </div>

      {/* ── Quando ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-hi">Quando</h2>

        <div className="flex flex-wrap gap-4">
          {(['schedule', 'now'] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-hi cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === m}
                onChange={() => setMode(m)}
                disabled={busy}
                className="h-4 w-4 accent-accent"
              />
              {m === 'schedule' ? 'Agendar' : 'Publicar agora'}
            </label>
          ))}
        </div>

        {mode === 'schedule' && (
          <div>
            <label htmlFor="when" className="block text-xs font-medium text-lo mb-1">
              Data e hora *
            </label>
            <input
              id="when"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              disabled={busy}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-lo">
              Horário de São Paulo ({timezoneLabel()}), não o do seu computador.
              Precisa ser no futuro.
            </p>
          </div>
        )}
      </div>

      {/* ── Preview ──────────────────────────────────────────────────────── */}
      {selected.length > 0 && content.trim() !== '' && (
        <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-hi">Como vai sair</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {channels
              .filter((c) => selected.includes(c.id))
              .map((channel) => {
                const max = LIMITS[channel.provider] ?? DEFAULT_LIMIT
                const cut = content.length > max
                return (
                  <div key={channel.id} className="rounded-lg border border-border bg-canvas p-3">
                    <div className="flex items-center gap-2">
                      <ChannelBadge provider={channel.provider} />
                      <span className="text-xs text-md line-clamp-1">{channel.name}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs text-hi">
                      {content.slice(0, max)}
                    </p>
                    {cut && (
                      <p className="mt-2 text-xs text-red-400">
                        Passa {content.length - max} caracteres do limite desta rede.
                      </p>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* ── Ações ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={
            busy ||
            blocking ||
            mediaBlocked ||
            overLimit ||
            !content.trim() ||
            selected.length === 0
          }
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {isPublishing ? <LoadingDots /> : mode === 'now' ? 'Publicar agora' : 'Agendar'}
        </button>

        <button
          type="button"
          onClick={handleCheck}
          disabled={busy || !content.trim()}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-md transition-colors hover:bg-elevated hover:text-hi disabled:opacity-50"
        >
          {isChecking ? <LoadingDots /> : 'Conferir texto'}
        </button>

        {blocking && (
          <span className="text-xs text-red-400">
            Corrija o que bloqueia antes de enviar.
          </span>
        )}

        {!blocking && mediaBlocked && (
          <span className="text-xs text-red-400">
            Resolva o criativo, ou tire-o da seleção, antes de enviar.
          </span>
        )}
      </div>
    </form>
  )
}
