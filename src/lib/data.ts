import { useEffect, useState } from 'react'
import { DATA_BASE } from '../config'
import type { Job, Meta } from '../types'

export interface Store { jobs: Job[]; meta: Meta | null; loading: boolean; error: string | null }
let cache: Store | null = null
let pending: Promise<Store> | null = null

function derive(j: Job): Job {
  const ref = j.issuedDate || j.filedDate
  const daysSince = ref ? Math.floor((Date.now() - new Date(ref + 'T00:00:00').getTime()) / 864e5) : null
  const hot = j.stage === 'Permit Issued' && !!j.contractor && j.electrician === 'missing'
  let window = ''
  if (j.stage === 'Land / Planning') window = '12–24 months out'
  else if (j.stage === 'Filed / Plan Review') window = '3–12 months out'
  else window = j.contractor ? 'Starts in ~1 week' : 'Starting soon'
  const v = j.valuation || 0
  const score = (hot ? 1000 : 0) + (j.stage === 'Land / Planning' ? 300 : 0) + Math.log10(v + 10) * 20 - (daysSince ?? 60) * 0.5
  let category = j.category
  if (!category) {
    const d = (j.description || '').toLowerCase()
    category = /apartment|dwelling|residen|family|condo|\bunits?\b|townhouse|\bhouse\b|\bhome\b|bedroom|\badu\b|housing|\bmih\b/.test(d) || (j.units ?? 0) > 0 ? 'Residential' : 'Commercial'
  }
  return { ...j, category, hot, window, score, daysSince }
}

export function loadData(): Promise<Store> {
  if (cache) return Promise.resolve(cache)
  if (!pending) {
    pending = Promise.all([fetch(`${DATA_BASE}jobs.json`).then((r) => r.json()), fetch(`${DATA_BASE}meta.json`).then((r) => r.json())])
      .then(([j, meta]) => { cache = { jobs: (j.jobs as Job[]).map(derive), meta, loading: false, error: null }; return cache })
      .catch((e) => { pending = null; return { jobs: [], meta: null, loading: false, error: String(e) } })
  }
  return pending
}
export function useData(): Store {
  const [s, set] = useState<Store>(cache ?? { jobs: [], meta: null, loading: true, error: null })
  useEffect(() => { let on = true; loadData().then((d) => on && set(d)); return () => { on = false } }, [])
  return s
}

export const slug = (s: string) => encodeURIComponent(s)
export interface Node { name: string; count: number; hot: number; early: number; value: number }
export function tally(jobs: Job[], key: (j: Job) => string): Node[] {
  const m = new Map<string, Node>()
  for (const j of jobs) {
    const k = key(j)
    const n = m.get(k) ?? { name: k, count: 0, hot: 0, early: 0, value: 0 }
    n.count++; if (j.hot) n.hot++; if (j.stage === 'Land / Planning') n.early++; n.value += j.valuation || 0
    m.set(k, n)
  }
  return [...m.values()].sort((a, b) => b.hot - a.hot || b.count - a.count)
}
