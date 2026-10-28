import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Job } from '../types'
import { applyRule, buildGeo, chips, dropChip, emptyRule, isEmptyRule, parseRule, type Rule } from '../lib/nlp'
import { JobList } from './Jobs'
import { Search, X, Bolt } from './Icons'
import { money } from '../lib/geo'

export const EXAMPLES = [
  'New commercial builds over $1M in Travis County TX with no electrician',
  'Contractor hired, no electrician, over $250k in Chicago',
  'Early-stage rezonings and land in planning in Brooklyn',
  'Renovations over $500k in Los Angeles',
  'Largest multifamily projects in New York with no electrician',
]
const SAVED_KEY = 'parcelopoly.savedRules'
const loadSaved = (): string[] => { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] } }

export function RuleInput({ value, onChange, onSubmit, big, placeholder }: { value: string; onChange: (s: string) => void; onSubmit: () => void; big?: boolean; placeholder?: string }) {
  return (
    <form className={`rulebox ${big ? 'big' : ''}`} onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
      <Search />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || 'Describe the jobs you want in plain English…'} aria-label="Search rules in plain English" />
      <button className="btn btn-primary btn-sm" type="submit">Find jobs</button>
    </form>
  )
}

export function Opportunities({ jobs, scope, withSearchParam = false, defaultQ = '' }: { jobs: Job[]; scope: string; withSearchParam?: boolean; defaultQ?: string }) {
  const geo = useMemo(() => buildGeo(jobs), [jobs])
  const [params, setParams] = useSearchParams()
  const urlQ = withSearchParam ? params.get('q') || '' : ''
  const [text, setText] = useState(urlQ || defaultQ)
  const [rule, setRule] = useState<Rule>(() => (urlQ || defaultQ ? parseRule(urlQ || defaultQ, geo) : emptyRule()))
  const [saved, setSaved] = useState<string[]>(loadSaved)
  const [lastQ, setLastQ] = useState(urlQ || defaultQ)

  // when the URL query changes (e.g. from hero box), re-parse
  useEffect(() => { if (withSearchParam && urlQ !== lastQ) { setText(urlQ); setLastQ(urlQ); setRule(urlQ ? parseRule(urlQ, geo) : emptyRule()) } /* eslint-disable-next-line */ }, [urlQ])
  // re-parse once the geo index becomes available (data loaded after first render)
  useEffect(() => { if (text && geo.cities.length) setRule(parseRule(text, geo)); /* eslint-disable-next-line */ }, [geo.cities.length])

  const run = (q = text) => {
    setLastQ(q); setRule(q.trim() ? parseRule(q, geo) : emptyRule())
    if (withSearchParam) setParams(q.trim() ? { q } : {}, { replace: true })
  }
  const results = useMemo(() => applyRule(jobs, rule), [jobs, rule])
  const hotCount = results.filter((j) => j.hot).length
  const earlyCount = results.filter((j) => j.stage === 'Land / Planning').length
  const total = results.reduce((a, j) => a + (j.valuation || 0), 0)
  const cs = chips(rule)
  const quick = (patch: (r: Rule) => void) => { const r: Rule = JSON.parse(JSON.stringify(rule)); patch(r); setRule(r) }
  const save = () => { if (!lastQ.trim() || saved.includes(lastQ)) return; const n = [lastQ, ...saved].slice(0, 8); setSaved(n); localStorage.setItem(SAVED_KEY, JSON.stringify(n)) }
  const removeSaved = (q: string) => { const n = saved.filter((x) => x !== q); setSaved(n); localStorage.setItem(SAVED_KEY, JSON.stringify(n)) }

  return (
    <section className="opps">
      <RuleInput value={text} onChange={setText} onSubmit={() => run()} placeholder={`Set your rules in plain English — e.g. “${EXAMPLES[0]}”`} />
      <div className="examples">
        <span>Try:</span>
        {EXAMPLES.slice(0, 4).map((e) => <button key={e} className="pill" onClick={() => { setText(e); run(e) }}>{e}</button>)}
      </div>
      <div className="quick">
        <button className={`toggle ${rule.electrician === 'missing' ? 'on' : ''}`} onClick={() => quick((r) => { r.electrician = r.electrician === 'missing' ? undefined : 'missing'; if (r.electrician) r.hasContractor = true })}><Bolt /> Contractor hired · electrician missing</button>
        <button className={`toggle ${rule.stages.includes('Land / Planning') ? 'on' : ''}`} onClick={() => quick((r) => { r.stages = r.stages.includes('Land / Planning') ? r.stages.filter((s) => s !== 'Land / Planning') : [...r.stages, 'Land / Planning'] })}>Land in planning</button>
        <button className={`toggle ${rule.stages.includes('Early') ? 'on' : ''}`} onClick={() => quick((r) => { r.stages = r.stages.includes('Early') ? r.stages.filter((s) => s !== 'Early') : [...r.stages, 'Early'] })}>Pre-construction</button>
        <button className={`toggle ${rule.minValue === 1e6 ? 'on' : ''}`} onClick={() => quick((r) => { r.minValue = r.minValue === 1e6 ? undefined : 1e6 })}>$1M+</button>
        <button className={`toggle ${rule.withinDays === 14 ? 'on' : ''}`} onClick={() => quick((r) => { r.withinDays = r.withinDays === 14 ? undefined : 14 })}>Last 14 days</button>
      </div>
      {saved.length > 0 && <div className="examples saved"><span>Saved rules:</span>{saved.map((q) => <span key={q} className="pill saved-pill"><button onClick={() => { setText(q); run(q) }}>{q}</button><button onClick={() => removeSaved(q)} aria-label="Remove saved rule"><X /></button></span>)}</div>}
      <div className="parsed">
        <span className="parsed-l">{cs.length ? 'Your rules, understood:' : `Showing everything in ${scope}`}</span>
        {cs.map((c) => <span key={c.id} className={`chip ${c.tone || ''}`}>{c.label}<button onClick={() => setRule(dropChip(rule, c.id))} aria-label={`Remove ${c.label}`}><X /></button></span>)}
        {!isEmptyRule(rule) && <button className="link-btn" onClick={() => { setText(''); run('') }}>Clear</button>}
        {lastQ.trim() && <button className="link-btn" onClick={save}>Save this rule</button>}
      </div>
      <div className="resultbar">
        <b>{results.length.toLocaleString()}</b> jobs · <b className="hotc">{hotCount.toLocaleString()}</b> contractor hired / no electrician · <b>{earlyCount.toLocaleString()}</b> land in planning · {money(total)} total listed value
      </div>
      <JobList jobs={results} />
    </section>
  )
}
