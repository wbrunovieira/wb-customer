import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Customer } from '@/lib/definitions'
import { getCustomerSocialChannels, getSocialFeed } from '@/app/actions/social'
import ChannelBadge from '../_components/channel-badge'
import PostMetricsPanel from './_components/post-metrics'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ days?: string }>
}

const TZ = 'America/Sao_Paulo'

const RANGES = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
]

function when(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`).catch(() => null)
  return { title: `${customer?.name ?? 'Cliente'} — Publicados` }
}

export default async function SocialFeedPage({ params, searchParams }: Props) {
  const { id } = await params
  const { days: daysParam } = await searchParams

  const days = RANGES.some((r) => String(r.days) === daysParam) ? Number(daysParam) : 30
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)

  // Consultado à parte porque devolve linked:false SEM erro e sem tocar no
  // motor: é o que distingue "ainda não ligaram" de "o motor falhou".
  const [customer, result, channelsResult] = await Promise.all([
    apiServer.get<Customer>(`/api/v1/customers/${id}`).catch(() => null),
    getSocialFeed(id, from.toISOString(), to.toISOString()),
    getCustomerSocialChannels(id),
  ])
  const linkState = channelsResult.data

  if (!customer) notFound()

  const posts = result.feed?.posts ?? []
  const failed = posts.filter((p) => p.state === 'ERROR').length

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
        <span className="font-medium text-hi">Publicados</span>

        <div className="ml-auto flex items-center gap-1">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={`/customers/${id}/social/feed?days=${r.days}`}
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

      {/* Falha é a notícia mais importante do feed; não pode depender de rolar
          a lista até topar com ela. */}
      {failed > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">
            {failed === 1
              ? '1 post não chegou a sair no período.'
              : `${failed} posts não chegaram a sair no período.`}
          </p>
        </div>
      )}

      {!linkState?.linked ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-hi">Falta ligar o cliente a um grupo</h2>
          <p className="mt-2 text-sm text-md">Sem grupo, não há histórico para mostrar.</p>
          <Link
            href={`/customers/${id}/social`}
            className="mt-3 inline-flex text-sm text-accent hover:underline"
          >
            Ligar agora
          </Link>
        </div>
      ) : result.message ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h2 className="text-sm font-semibold text-amber-400">Não deu para ler o histórico</h2>
          <p className="mt-2 text-sm text-md">{result.message}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-hi">Nada publicado nos últimos {days} dias</h2>
          <p className="mt-2 text-sm text-md">
            Quando algo sair, aparece aqui com o resultado que a rede informar.
          </p>
          <Link
            href={`/customers/${id}/social/queue`}
            className="mt-3 inline-flex text-sm text-accent hover:underline"
          >
            Ver o que está agendado
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <li
              key={`${p.id}-${p.channelId}`}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ChannelBadge provider={p.provider} />
                <span className="text-xs text-md line-clamp-1">{p.channelName}</span>
                <span className="text-xs text-lo">{when(p.publishAt)}</span>
                {p.state === 'ERROR' && (
                  <span className="ml-auto inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-600/20">
                    Não saiu
                  </span>
                )}
              </div>

              <p className="whitespace-pre-wrap text-sm text-hi line-clamp-4">
                {p.content || <span className="text-lo">Sem texto.</span>}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                {p.state === 'ERROR' ? (
                  <p className="text-xs text-lo">
                    Post que falhou não tem resultado para mostrar.
                  </p>
                ) : (
                  <PostMetricsPanel customerId={id} postId={p.id} />
                )}

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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
