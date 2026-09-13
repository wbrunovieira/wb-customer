import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Customer } from '@/lib/definitions'
import { getCustomerSocialChannels, listSocialGroups } from '@/app/actions/social'
import SocialGroupForm from './_components/social-group-form'
import ChannelBadge from './_components/channel-badge'

type Props = {
  params: Promise<{ id: string }>
}

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL ?? ''

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`).catch(() => null)
  return { title: `${customer?.name ?? 'Cliente'} — Redes sociais` }
}

export default async function CustomerSocialPage({ params }: Props) {
  const { id } = await params

  const [customer, groupsResult, channelsResult] = await Promise.all([
    apiServer.get<Customer>(`/api/v1/customers/${id}`).catch(() => null),
    listSocialGroups(),
    getCustomerSocialChannels(id),
  ])

  if (!customer) notFound()

  const groups = groupsResult.groups ?? []
  const link = channelsResult.data
  const linked = link?.linked ?? false
  const channels = link?.channels ?? []
  // A mensagem do backend já diz o que falta (503 nomeia as variáveis
  // ausentes). Repassar isso é mais útil do que "erro ao carregar".
  const engineProblem = groupsResult.message ?? channelsResult.message ?? null

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/customers/${id}`} className="text-md transition-colors hover:text-hi">
          {customer.name}
        </Link>
        <span className="text-lo">/</span>
        <span className="font-medium text-hi">Redes sociais</span>

        {linked && (
          <Link
            href={`/customers/${id}/social/feed`}
            className="ml-auto rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-md transition-colors hover:bg-elevated hover:text-hi"
          >
            Publicados
          </Link>
        )}

        {linked && (
          <Link
            href={`/customers/${id}/social/queue`}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-md transition-colors hover:bg-elevated hover:text-hi"
          >
            Agenda
          </Link>
        )}

        {linked && channels.some((c) => !c.disabled) && (
          <Link
            href={`/customers/${id}/social/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo post
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent font-semibold text-sm">
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xs text-lo">Publicando para</p>
          <p className="text-sm font-semibold text-hi">{customer.name}</p>
        </div>
        {linked && (
          <span className="ml-auto inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-600/20">
            Ligado
          </span>
        )}
      </div>

      {engineProblem ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h2 className="text-sm font-semibold text-amber-400">
            Motor de publicação indisponível
          </h2>
          <p className="mt-2 text-sm text-md">{engineProblem}</p>
          <p className="mt-3 text-xs text-lo">
            Enquanto isso não for resolvido, não dá para ligar grupo nem agendar post.
            O resto do cadastro do cliente segue funcionando normalmente.
          </p>
        </div>
      ) : (
        <>
          <SocialGroupForm
            customerId={id}
            customerName={customer.name}
            groups={groups}
            currentGroupId={link?.groupId ?? null}
          />

          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-hi">Canais conectados</h2>
              {linked && link?.groupName && (
                <span className="text-xs text-lo">grupo {link.groupName}</span>
              )}
            </div>

            {!linked ? (
              <p className="mt-3 text-sm text-md">
                Ligue este cliente a um grupo acima para ver em quais redes ele publica.
              </p>
            ) : channels.length === 0 ? (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-sm text-md">
                  O grupo existe, mas nenhuma rede foi conectada nele ainda. Agendar
                  agora encheria uma fila que não sai.
                </p>
                <p className="text-xs text-lo">
                  Conectar a conta social é um passo único por cliente e acontece na
                  interface do Postiz — ele não expõe rota pública para isso.
                </p>
              </div>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-border">
                {channels.map((channel) => (
                  <li key={channel.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <ChannelBadge provider={channel.provider} />
                      <span className="text-sm text-hi">{channel.name}</span>
                    </div>
                    {channel.disabled && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-600/20">
                        Desativado — não publica
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {POSTIZ_URL && (
              <a
                href={POSTIZ_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm text-accent hover:underline"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Conectar conta ou nomear cliente no Postiz
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )
}
