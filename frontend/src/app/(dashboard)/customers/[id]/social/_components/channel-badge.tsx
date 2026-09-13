/** Selo por rede. Cor ajuda a bater o olho e reconhecer o canal sem ler. */
const PROVIDER: Record<string, { label: string; cls: string }> = {
  instagram: { label: 'Instagram', cls: 'bg-pink-500/10 text-pink-400 ring-pink-600/20' },
  facebook: { label: 'Facebook', cls: 'bg-blue-500/10 text-blue-400 ring-blue-600/20' },
  linkedin: { label: 'LinkedIn', cls: 'bg-sky-500/10 text-sky-400 ring-sky-600/20' },
  tiktok: { label: 'TikTok', cls: 'bg-slate-500/10 text-slate-300 ring-slate-600/20' },
  youtube: { label: 'YouTube', cls: 'bg-red-500/10 text-red-400 ring-red-600/20' },
  threads: { label: 'Threads', cls: 'bg-slate-500/10 text-slate-300 ring-slate-600/20' },
}

export default function ChannelBadge({ provider }: { provider: string }) {
  // Provedor desconhecido ainda aparece: rede nova no motor não pode sumir da
  // tela só porque este mapa não foi atualizado.
  const meta = PROVIDER[provider] ?? {
    label: provider,
    cls: 'bg-canvas text-md ring-border',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.cls}`}
    >
      {meta.label}
    </span>
  )
}
