'use client'

import { useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { TrafficCampaignObjective, AdCallToAction, Creative } from '@/lib/definitions'
import { createCampaign, createAdSet, createAd } from '@/app/actions/campaigns'
import CreativePicker from '../../_components/creative-picker'

const OBJECTIVES: { value: TrafficCampaignObjective; label: string }[] = [
  { value: 'CONVERSIONS', label: 'Conversões' },
  { value: 'LINK_CLICKS', label: 'Tráfego' },
  { value: 'REACH', label: 'Alcance' },
  { value: 'BRAND_AWARENESS', label: 'Reconhecimento' },
  { value: 'LEAD_GENERATION', label: 'Geração de Leads' },
  { value: 'VIDEO_VIEWS', label: 'Views' },
  { value: 'POST_ENGAGEMENT', label: 'Engajamento' },
]

const CTAS: { value: AdCallToAction; label: string }[] = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Inscrever-se' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'BOOK_NOW', label: 'Reservar' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'GET_QUOTE', label: 'Obter Orçamento' },
  { value: 'SUBSCRIBE', label: 'Assinar' },
  { value: 'WATCH_MORE', label: 'Ver Mais' },
  { value: 'NO_BUTTON', label: 'Sem Botão' },
]

interface AdData {
  name: string
  creativeId: string | null
  creative: Creative | null
  primaryText: string
  headline: string
  description: string
  callToAction: AdCallToAction
  destinationUrl: string
}

interface AdSetData {
  name: string
  dailyBudget: string
  targeting: string
  startAt: string
  endAt: string
  ads: AdData[]
}

function emptyAd(): AdData {
  return {
    name: '',
    creativeId: null,
    creative: null,
    primaryText: '',
    headline: '',
    description: '',
    callToAction: 'LEARN_MORE',
    destinationUrl: '',
  }
}

function emptyAdSet(): AdSetData {
  return {
    name: '',
    dailyBudget: '',
    targeting: '',
    startAt: '',
    endAt: '',
    ads: [emptyAd()],
  }
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  const steps = [
    { n: 1, label: 'Campanha' },
    { n: 2, label: 'Ad Sets' },
    { n: 3, label: 'Anúncios' },
  ]
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                current === s.n
                  ? 'bg-accent text-white'
                  : current > s.n
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-elevated text-lo'
              }`}
            >
              {current > s.n ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                s.n
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                current === s.n ? 'text-hi' : current > s.n ? 'text-green-400' : 'text-lo'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < total - 1 && (
            <div className={`mx-3 h-px w-8 transition-colors ${current > s.n ? 'bg-green-500/40' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function NewCampaignPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const customerId = params.id

  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Step 1 state
  const [name, setName] = useState('')
  const [objective, setObjective] = useState<TrafficCampaignObjective>('CONVERSIONS')
  const [dailyBudget, setDailyBudget] = useState('')
  const [plannedBudget, setPlannedBudget] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [notes, setNotes] = useState('')

  // Step 2+3 state
  const [adSets, setAdSets] = useState<AdSetData[]>([emptyAdSet()])

  function updateAdSet(idx: number, partial: Partial<AdSetData>) {
    setAdSets(prev => prev.map((as, i) => i === idx ? { ...as, ...partial } : as))
  }

  function addAdSet() {
    setAdSets(prev => [...prev, emptyAdSet()])
  }

  function removeAdSet(idx: number) {
    setAdSets(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)
  }

  function updateAd(adSetIdx: number, adIdx: number, partial: Partial<AdData>) {
    setAdSets(prev => prev.map((as, i) => {
      if (i !== adSetIdx) return as
      return {
        ...as,
        ads: as.ads.map((ad, j) => j === adIdx ? { ...ad, ...partial } : ad),
      }
    }))
  }

  function addAd(adSetIdx: number) {
    setAdSets(prev => prev.map((as, i) =>
      i === adSetIdx ? { ...as, ads: [...as.ads, emptyAd()] } : as
    ))
  }

  function removeAd(adSetIdx: number, adIdx: number) {
    setAdSets(prev => prev.map((as, i) => {
      if (i !== adSetIdx) return as
      return {
        ...as,
        ads: as.ads.length > 1 ? as.ads.filter((_, j) => j !== adIdx) : as.ads,
      }
    }))
  }

  async function handleSubmit() {
    setError(null)
    startTransition(async () => {
      // Create campaign
      const campaignResult = await createCampaign(customerId, {
        name,
        objective,
        dailyBudget: dailyBudget ? parseFloat(dailyBudget) : undefined,
        plannedBudget: plannedBudget ? parseFloat(plannedBudget) : undefined,
        startAt: startAt || undefined,
        endAt: endAt || undefined,
        notes: notes || undefined,
      })

      if (campaignResult.message || !campaignResult.campaignId) {
        setError(campaignResult.message ?? 'Erro ao criar campanha')
        return
      }

      const campaignId = campaignResult.campaignId

      // Create ad sets and ads
      for (const adSet of adSets) {
        let targeting: Record<string, unknown> | undefined
        if (adSet.targeting.trim()) {
          try {
            targeting = JSON.parse(adSet.targeting)
          } catch {
            targeting = undefined
          }
        }

        const adSetResult = await createAdSet(customerId, campaignId, {
          name: adSet.name,
          dailyBudget: adSet.dailyBudget ? parseFloat(adSet.dailyBudget) : undefined,
          targeting,
          startAt: adSet.startAt || undefined,
          endAt: adSet.endAt || undefined,
        })

        if (adSetResult.message || !adSetResult.adSetId) continue

        for (const ad of adSet.ads) {
          await createAd(customerId, campaignId, adSetResult.adSetId, {
            name: ad.name,
            creativeId: ad.creativeId || undefined,
            primaryText: ad.primaryText || undefined,
            headline: ad.headline || undefined,
            description: ad.description || undefined,
            callToAction: ad.callToAction,
            destinationUrl: ad.destinationUrl || undefined,
          })
        }
      }

      router.push(`/customers/${customerId}/traffic`)
    })
  }

  const canProceedStep1 = name.trim().length > 0
  const canProceedStep2 = adSets.every(as => as.name.trim().length > 0)
  const canProceedStep3 = adSets.every(as => as.ads.every(ad => ad.name.trim().length > 0))

  const inputCls = 'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50'

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/customers/${customerId}/traffic`)}
          className="flex items-center gap-1.5 text-sm text-md transition-colors hover:text-hi"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Tráfego Pago
        </button>
        <span className="text-lo">/</span>
        <span className="text-sm font-medium text-hi">Nova Campanha</span>
      </div>

      {/* Step indicator */}
      <div className="rounded-xl border border-border bg-surface px-6 py-4">
        <StepIndicator current={step} total={3} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* ── STEP 1: Campaign ── */}
      {step === 1 && (
        <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-hi">Detalhes da Campanha</h2>

          <div>
            <label className="block text-xs font-medium text-lo mb-1">Nome *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Black Friday 2025"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-lo mb-1">Objetivo *</label>
            <select
              value={objective}
              onChange={e => setObjective(e.target.value as TrafficCampaignObjective)}
              className={inputCls}
            >
              {OBJECTIVES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-lo mb-1">Orçamento Diário R$ (opcional)</label>
              <input
                type="number"
                value={dailyBudget}
                onChange={e => setDailyBudget(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-lo mb-1">Orçamento Planejado Total R$ (opcional)</label>
              <input
                type="number"
                value={plannedBudget}
                onChange={e => setPlannedBudget(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-lo mb-1">Data início (opcional)</label>
              <input
                type="date"
                value={startAt}
                onChange={e => setStartAt(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-lo mb-1">Data fim (opcional)</label>
              <input
                type="date"
                value={endAt}
                onChange={e => setEndAt(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-lo mb-1">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Observações sobre a campanha..."
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      )}

      {/* ── STEP 2: Ad Sets ── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-hi">Ad Sets</h2>
            <button
              type="button"
              onClick={addAdSet}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-md hover:text-hi transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Adicionar Ad Set
            </button>
          </div>

          {adSets.map((adSet, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-lo uppercase tracking-wider">Ad Set {idx + 1}</span>
                {adSets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAdSet(idx)}
                    className="text-xs text-lo hover:text-red-400 transition-colors"
                  >
                    Remover
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-lo mb-1">Nome *</label>
                <input
                  value={adSet.name}
                  onChange={e => updateAdSet(idx, { name: e.target.value })}
                  placeholder="Ex: Público Frio 25-45"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-lo mb-1">Orçamento diário próprio R$ (opcional)</label>
                <input
                  type="number"
                  value={adSet.dailyBudget}
                  onChange={e => updateAdSet(idx, { dailyBudget: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-lo mb-1">Targeting JSON (opcional)</label>
                <textarea
                  value={adSet.targeting}
                  onChange={e => updateAdSet(idx, { targeting: e.target.value })}
                  rows={3}
                  placeholder={`{"age_min": 25, "age_max": 45}`}
                  className={`${inputCls} resize-none font-mono text-xs`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-lo mb-1">Data início (opcional)</label>
                  <input
                    type="date"
                    value={adSet.startAt}
                    onChange={e => updateAdSet(idx, { startAt: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-lo mb-1">Data fim (opcional)</label>
                  <input
                    type="date"
                    value={adSet.endAt}
                    onChange={e => updateAdSet(idx, { endAt: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 3: Ads ── */}
      {step === 3 && (
        <div className="flex flex-col gap-6">
          <h2 className="text-sm font-semibold text-hi">Anúncios</h2>

          {adSets.map((adSet, adSetIdx) => (
            <div key={adSetIdx} className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <span className="text-sm font-medium text-hi">{adSet.name || `Ad Set ${adSetIdx + 1}`}</span>
                <button
                  type="button"
                  onClick={() => addAd(adSetIdx)}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-md hover:text-hi transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Adicionar Anúncio
                </button>
              </div>

              <div className="divide-y divide-border">
                {adSet.ads.map((ad, adIdx) => (
                  <div key={adIdx} className="p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-lo uppercase tracking-wider">Anúncio {adIdx + 1}</span>
                      {adSet.ads.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAd(adSetIdx, adIdx)}
                          className="text-xs text-lo hover:text-red-400 transition-colors"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-lo mb-1">Nome *</label>
                      <input
                        value={ad.name}
                        onChange={e => updateAd(adSetIdx, adIdx, { name: e.target.value })}
                        placeholder="Ex: Anúncio Vídeo - Hook Problema"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-lo mb-1">Criativo</label>
                      <CreativePicker
                        customerId={customerId}
                        value={ad.creativeId}
                        selectedCreative={ad.creative}
                        onChange={(creativeId, creative) =>
                          updateAd(adSetIdx, adIdx, { creativeId, creative })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-lo mb-1">Texto principal</label>
                      <textarea
                        value={ad.primaryText}
                        onChange={e => updateAd(adSetIdx, adIdx, { primaryText: e.target.value })}
                        rows={2}
                        placeholder="Texto que aparece no post..."
                        className={`${inputCls} resize-none`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-lo mb-1">Headline</label>
                        <input
                          value={ad.headline}
                          onChange={e => updateAd(adSetIdx, adIdx, { headline: e.target.value })}
                          placeholder="Título do link..."
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-lo mb-1">Descrição</label>
                        <input
                          value={ad.description}
                          onChange={e => updateAd(adSetIdx, adIdx, { description: e.target.value })}
                          placeholder="Descrição complementar..."
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-lo mb-1">CTA</label>
                        <select
                          value={ad.callToAction}
                          onChange={e => updateAd(adSetIdx, adIdx, { callToAction: e.target.value as AdCallToAction })}
                          className={inputCls}
                        >
                          {CTAS.map(cta => (
                            <option key={cta.value} value={cta.value}>{cta.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-lo mb-1">URL destino</label>
                        <input
                          type="url"
                          value={ad.destinationUrl}
                          onChange={e => updateAd(adSetIdx, adIdx, { destinationUrl: e.target.value })}
                          placeholder="https://..."
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer navigation */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={() => step === 1 ? router.push(`/customers/${customerId}/traffic`) : setStep(s => s - 1)}
          disabled={isPending}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-md hover:bg-elevated transition-colors disabled:opacity-50"
        >
          {step === 1 ? 'Cancelar' : 'Anterior'}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={
              isPending ||
              (step === 1 && !canProceedStep1) ||
              (step === 2 && !canProceedStep2)
            }
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Próximo
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !canProceedStep3}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Criando...' : 'Criar Campanha'}
          </button>
        )}
      </div>
    </div>
  )
}
