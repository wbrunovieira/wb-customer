'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ContentViolation, Creative, SocialChannel } from '@/lib/definitions'
import { publishSocialPost, validateSocialContent } from '@/app/actions/social'
import { useToast } from '@/components/toast/toast-context'
import LoadingDots from '@/components/ui/loading-dots'
import { localInputToISO, timezoneLabel } from '@/lib/timezone'
import { limitFor, strictestLimit } from '@/lib/social-limits'
import CreativePicker from '../../../traffic/_components/creative-picker'
import ChannelBadge from '../../_components/channel-badge'

/** O motor recusa qualquer outro formato; barrar aqui evita descobrir no envio. */
const SUPPORTED_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4']

/** Limite do carrossel do Instagram, a rede mais restritiva entre as que usamos. */
const MAX_CAROUSEL = 10

/** Mesma regra da galeria de criativos, para a prévia mostrar o que ela mostra. */
function thumbFor(c: Creative): string | null {
  if (c.thumbnailUrl) return c.thumbnailUrl
  if (c.driveFileId) return `https://drive.google.com/thumbnail?id=${c.driveFileId}&sz=w600-h600`
  return null
}

interface Props {
  customerId: string
  channels: SocialChannel[]
  /** Criativo já escolhido, quando se chega aqui pela galeria. */
  initialCreatives?: Creative[]
}

export default function PostComposer({
  customerId,
  channels,
  initialCreatives = [],
}: Props) {
  const { success, error: toastError } = useToast()
  const router = useRouter()
  const [isPublishing, startPublishing] = useTransition()
  const [isChecking, startChecking] = useTransition()

  const [selected, setSelected] = useState<string[]>([])
  // Legenda do primeiro criativo como ponto de partida, mesma regra de quando
  // se escolhe pela galeria: preenche, não impõe.
  const [content, setContent] = useState(initialCreatives[0]?.caption ?? '')
  // Lista, não um: carrossel é vários criativos, e a ORDEM é o que a pessoa vê
  // ao deslizar — trocar a primeira imagem troca o post.
  const [creatives, setCreatives] = useState<Creative[]>(initialCreatives)
  const [mode, setMode] = useState<'now' | 'schedule'>('schedule')
  const [scheduledFor, setScheduledFor] = useState('')
  const [violations, setViolations] = useState<ContentViolation[] | null>(null)

  const publishable = channels.filter((c) => !c.disabled)

  const limit = useMemo(
    () =>
      strictestLimit(
        channels.filter((c) => selected.includes(c.id)).map((c) => c.provider),
      ),
    [channels, selected],
  )

  const overLimit = limit !== null && content.length > limit
  // Criativo sem arquivo, ou em formato recusado, trava o envio: o backend
  // responderia 409/415, e descobrir isso depois do clique é tarde.
  const semArquivo = creatives.filter((c) => !c.driveFileId)
  const formatoRecusado = creatives.filter(
    (c) => c.driveFileId && c.mimeType && !SUPPORTED_MIME.includes(c.mimeType),
  )
  const mediaBlocked = semArquivo.length > 0 || formatoRecusado.length > 0
  const blocking = violations?.some((v) => v.severity === 'block') ?? false
  const busy = isPublishing || isChecking

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function handleCreative(_id: string | null, picked: Creative | null) {
    if (!picked) return
    if (creatives.some((c) => c.id === picked.id)) return
    if (creatives.length >= MAX_CAROUSEL) return

    setCreatives((prev) => [...prev, picked])
    // A legenda do criativo é ponto de partida, não imposição: só preenche
    // enquanto ninguém escreveu nada, para não apagar texto já digitado.
    if (picked.caption && content.trim() === '') setContent(picked.caption)
  }

  function removeCreative(id: string) {
    setCreatives((prev) => prev.filter((c) => c.id !== id))
  }

  /** Mover é a única forma de corrigir a ordem sem recomeçar a seleção. */
  function moveCreative(index: number, direction: -1 | 1) {
    setCreatives((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
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
        creativeIds: creatives.map((c) => c.id),
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
          <h2 className="text-sm font-semibold text-hi">Criativos</h2>
          <p className="mt-1 text-xs text-lo">
            Opcional. Escolha mais de um para montar carrossel — a ordem da lista é a
            ordem em que aparecem.
          </p>
        </div>

        {creatives.length > 0 && (
          <ol className="flex flex-col gap-2">
            {creatives.map((c, i) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-canvas px-3 py-2"
              >
                <span className="text-xs font-semibold text-lo tabular-nums">{i + 1}</span>
                {c.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnailUrl} alt={c.title} className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded bg-elevated" />
                )}
                <span className="flex-1 text-sm text-hi line-clamp-1">{c.title}</span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveCreative(i, -1)}
                    disabled={i === 0 || busy}
                    aria-label="Subir"
                    className="rounded px-1.5 py-0.5 text-xs text-lo hover:text-hi disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCreative(i, 1)}
                    disabled={i === creatives.length - 1 || busy}
                    aria-label="Descer"
                    className="rounded px-1.5 py-0.5 text-xs text-lo hover:text-hi disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCreative(c.id)}
                    disabled={busy}
                    className="rounded px-2 py-0.5 text-xs text-lo transition-colors hover:text-red-400 disabled:opacity-30"
                  >
                    remover
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        {creatives.length < MAX_CAROUSEL && (
          <CreativePicker
            customerId={customerId}
            value={null}
            onChange={handleCreative}
            selectedCreative={null}
          />
        )}

        {creatives.length >= MAX_CAROUSEL && (
          <p className="text-xs text-lo">
            Máximo de {MAX_CAROUSEL} imagens por post, que é o limite do Instagram.
          </p>
        )}

        {semArquivo.length > 0 && (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
            Sem arquivo enviado: {semArquivo.map((c) => c.title).join(', ')}. Envie a
            arte na tela de criativos, ou tire da seleção.
          </p>
        )}

        {formatoRecusado.length > 0 && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
            Formato não aceito nas redes: {formatoRecusado.map((c) => c.title).join(', ')}.
            Use PNG, JPEG, GIF, WEBP ou MP4.
          </p>
        )}

        {creatives.length > 0 && !mediaBlocked && (
          <p className="rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-md">
            {creatives.length === 1
              ? 'A arte vai junto com o post.'
              : `As ${creatives.length} imagens vão no carrossel, nesta ordem.`}
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
      {selected.length > 0 && (content.trim() !== '' || creatives.length > 0) && (
        <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-hi">Como vai sair</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {channels
              .filter((c) => selected.includes(c.id))
              .map((channel) => {
                const max = limitFor(channel.provider)
                const cut = content.length > max
                return (
                  <div key={channel.id} className="rounded-lg border border-border bg-canvas p-3">
                    <div className="flex items-center gap-2">
                      <ChannelBadge provider={channel.provider} />
                      <span className="text-xs text-md line-clamp-1">{channel.name}</span>
                    </div>

                    {creatives.length > 0 && (
                      <div className="mt-2">
                        {/* Em faixa e na ordem: é assim que o carrossel é visto,
                            e a numeração deixa a ordem conferível sem contar. */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {creatives.map((c, i) => {
                            const thumb = thumbFor(c)
                            return (
                              <div
                                key={c.id}
                                className="relative shrink-0"
                                title={c.title}
                              >
                                {thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={thumb}
                                    alt={c.title}
                                    className="h-24 w-24 rounded object-cover"
                                  />
                                ) : (
                                  <div className="flex h-24 w-24 items-center justify-center rounded bg-elevated p-1 text-center text-[10px] text-lo">
                                    {c.title}
                                  </div>
                                )}
                                {creatives.length > 1 && (
                                  <span className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[10px] font-medium text-white tabular-nums">
                                    {i + 1}/{creatives.length}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

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
            Resolva os criativos apontados, ou tire-os da seleção, antes de enviar.
          </span>
        )}
      </div>
    </form>
  )
}
