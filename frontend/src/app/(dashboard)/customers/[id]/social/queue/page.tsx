import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Customer, QueuedPost } from '@/lib/definitions'
import { getSocialQueue } from '@/app/actions/social'
import ChannelBadge from '../_components/channel-badge'
import CancelPostButton from './_components/cancel-post-button'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ days?: string }>
}

/** A operação é no Brasil; o post sai num horário do Brasil. */
const TZ = 'America/Sao_Paulo'

const STATE: Record<string, { label: string; cls: string }> = {
  QUEUE: { label: 'Na fila', cls: 'bg-sky-500/10 text-sky-400 ring-sky-600/20' },
  PUBLISHED: { label: 'Publicado', cls: 'bg-green-500/10 text-green-400 ring-green-600/20' },
  ERROR: { label: 'Falhou', cls: 'bg-red-500/10 text-red-400 ring-red-600/20' },
  DRAFT: { label: 'Rascunho', cls: 'bg-canvas text-md ring-border' },
}

const RANGES = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
]

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: TZ,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function hour(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`).catch(() => null)
  return { title: `${customer?.name ?? 'Cliente'} — Agenda` }
}

export default async function SocialQueuePage({ params, searchParams }: Props) {
  const { id } = await params
  const { days: daysParam } = await searchParams

  const days = RANGES.some((r) => String(r.days) === daysParam) ? Number(daysParam) : 30
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000)

  const [customer, result] = await Promise.all([
    apiServer.get<Customer>(`/api/v1/customers/${id}`).catch(() => null),
    getSocialQueue(id, from.toISOString(), to.toISOString()),
  ])

  if (!customer) notFound()

  const posts = result.queue?.posts ?? []

  // Um post espelhado em várias redes volta como uma linha por rede, com o
  // mesmo group. Contar isso é o que permite avisar o tamanho do cancelamento.
  const mirrored = new Map<string, number>()
  for (const p of posts) {
    const key = p.group ?? p.id
    mirrored.set(key, (mirrored.get(key) ?? 0) + 1)
  }

  const byDay = posts.reduce<Record<string, QueuedPost[]>>((acc, p) => {
    const key = dayKey(p.publishAt)
    acc[key] = [...(acc[key] ?? []), p]
    return acc
  }, {})

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/customers/${id}`} className="text-md transition-colors hover:text-hi">
          {customer.name}
        </Link>
        <span className="text-lo">/</span>
        <Link href={`/customers/${id}/social`} className="text-md transition-colors hover:text-hi">
          Redes sociais
        </Link>
        <span className="text-lo">/</span>
        <span className="font-medium text-hi">Agenda</span>

        <div className="ml-auto flex items-center gap-1">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={`/customers/${id}/social/queue?days=${r.days}`}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                r.days === days
                  ? 'bg-accent/10 text-accent'
                  : 'text-md hover:bg-elevated hover:text-hi'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {result.message ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h2 className="text-sm font-semibold text-amber-400">Não deu para ler a fila</h2>
          <p className="mt-2 text-sm text-md">{result.message}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-hi">Nada agendado nos próximos {days} dias</h2>
          <p className="mt-2 text-sm text-md">
            A agenda mostra também o que for criado direto no Postiz, não só o que sai daqui.
          </p>
          <Link
            href={`/customers/${id}/social/new`}
            className="mt-3 inline-flex text-sm text-accent hover:underline"
          >
            Criar um post
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(byDay).map(([day, dayPosts]) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-lo">{day}</h2>
              <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
                {dayPosts.map((p) => {
                  const state = STATE[p.state] ?? { label: p.state, cls: 'bg-canvas text-md ring-border' }
                  return (
                    <li key={`${p.id}-${p.channelId}`} className="flex flex-col gap-2 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-hi tabular-nums">
                          {hour(p.publishAt)}
                        </span>
                        <ChannelBadge provider={p.provider} />
                        <span className="text-xs text-md line-clamp-1">{p.channelName}</span>
                        <span
                          className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${state.cls}`}
                        >
                          {state.label}
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap text-sm text-md line-clamp-3">
                        {p.content || <span className="text-lo">Sem texto.</span>}
                      </p>

                      <div className="flex items-center gap-3">
                        {p.url && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline"
                          >
                            Ver na rede
                          </a>
                        )}
                        {/* Publicado não se cancela: já saiu. */}
                        {p.state !== 'PUBLISHED' && (
                          <div className="ml-auto">
                            <CancelPostButton
                              customerId={id}
                              postId={p.id}
                              mirroredCount={mirrored.get(p.group ?? p.id) ?? 1}
                            />
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
