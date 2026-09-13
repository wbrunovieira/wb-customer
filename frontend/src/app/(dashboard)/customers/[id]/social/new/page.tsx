import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Customer } from '@/lib/definitions'
import { getCustomerSocialChannels } from '@/app/actions/social'
import PostComposer from './_components/post-composer'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`).catch(() => null)
  return { title: `${customer?.name ?? 'Cliente'} — Novo post` }
}

export default async function NewSocialPostPage({ params }: Props) {
  const { id } = await params

  const [customer, channelsResult] = await Promise.all([
    apiServer.get<Customer>(`/api/v1/customers/${id}`).catch(() => null),
    getCustomerSocialChannels(id),
  ])

  if (!customer) notFound()

  const link = channelsResult.data
  const channels = link?.channels ?? []

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/customers/${id}`} className="text-md transition-colors hover:text-hi">
          {customer.name}
        </Link>
        <span className="text-lo">/</span>
        <Link href={`/customers/${id}/social`} className="text-md transition-colors hover:text-hi">
          Redes sociais
        </Link>
        <span className="text-lo">/</span>
        <span className="font-medium text-hi">Novo post</span>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent font-semibold text-sm">
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xs text-lo">Publicando para</p>
          <p className="text-sm font-semibold text-hi">{customer.name}</p>
        </div>
        {link?.groupName && (
          <span className="ml-auto text-xs text-lo">grupo {link.groupName}</span>
        )}
      </div>

      {channelsResult.message ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h2 className="text-sm font-semibold text-amber-400">
            Motor de publicação indisponível
          </h2>
          <p className="mt-2 text-sm text-md">{channelsResult.message}</p>
        </div>
      ) : !link?.linked ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-hi">Falta ligar o cliente a um grupo</h2>
          <p className="mt-2 text-sm text-md">
            Sem grupo, não há conta onde publicar.
          </p>
          <Link
            href={`/customers/${id}/social`}
            className="mt-3 inline-flex text-sm text-accent hover:underline"
          >
            Ligar agora
          </Link>
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-hi">Nenhuma rede conectada</h2>
          <p className="mt-2 text-sm text-md">
            O grupo existe, mas nenhuma conta social foi conectada nele. Agendar agora
            encheria uma fila que não sai.
          </p>
          <Link
            href={`/customers/${id}/social`}
            className="mt-3 inline-flex text-sm text-accent hover:underline"
          >
            Ver o que falta
          </Link>
        </div>
      ) : (
        <PostComposer customerId={id} channels={channels} />
      )}
    </div>
  )
}
