// Client-side natural-language rule parser. No API keys, no network.
import type { Job } from '../types'
import { STATES, money } from './geo'

export interface Rule {
  minValue?: number; maxValue?: number
  states: string[]; counties: string[]; cities: string[]
  category?: 'Residential' | 'Commercial'
  kinds: string[]; stages: string[]
  electrician?: 'missing' | 'on_file'
  hasContractor?: boolean
  multifamily?: boolean
  withinDays?: number
  keywords: string[]
  sort?: 'value' | 'newest' | 'score'
}
export const emptyRule = (): Rule => ({ states: [], counties: [], cities: [], kinds: [], stages: [], keywords: [] })

export interface GeoIndex { counties: { name: string; state: string }[]; cities: { name: string; state: string }[] }
export const buildGeo = (jobs: Job[]): GeoIndex => {
  const c = new Map<string, { name: string; state: string }>(), t = new Map<string, { name: string; state: string }>()
  for (const j of jobs) { c.set(j.state + j.county, { name: j.county, state: j.state }); t.set(j.state + j.city, { name: j.city, state: j.state }) }
  return { counties: [...c.values()], cities: [...t.values()] }
}

const mult = (u?: string) => { const x = (u || '').toLowerCase(); if (!x) return 1; if (x.startsWith('k') || x.startsWith('th')) return 1e3; if (x === 'b' || x.startsWith('bil')) return 1e9; return 1e6 }
const parseAmt = (n: string, u?: string) => { const v = parseFloat(n.replace(/,/g, '')); if (!Number.isFinite(v)) return undefined; const m = !u && v < 1000 ? 1e3 : mult(u) /* bare small numbers are read as thousands */
  return v * m }
const AMT = String.raw`\$?\s*([\d][\d,]*\.?\d*)\s*(k|thousand|m|mm|million|b|billion)?\b`
const KEYWORDS = ['hospital', 'school', 'hotel', 'warehouse', 'restaurant', 'retail', 'office', 'industrial', 'apartment', 'apartments', 'multifamily', 'adu', 'solar', 'pool', 'garage', 'condo', 'townhouse', 'medical', 'lab', 'data center', 'church', 'parking', 'mixed-use', 'mixed use', 'senior', 'student housing', 'storage', 'gym', 'daycare', 'cannabis', 'brewery', 'grocery', 'bank']

export function parseRule(input: string, geo: GeoIndex): Rule {
  const r = emptyRule()
  let q = ' ' + input.replace(/[“”]/g, '"') + ' '
  const eat = (re: RegExp, fn: (m: RegExpExecArray) => void) => { const m = re.exec(q); if (m) { fn(m); q = q.replace(m[0], ' ') } }

  // electrician
  eat(/\b(?:with\s*out|without|no|missing|lacking|needs?|need|not\s+(?:yet\s+)?hav(?:e|ing))\s+(?:an?\s+|the\s+)?(?:electrician|electrical(?:\s+contractor)?|sparky)s?(?:\s+(?:on file|named|listed|hired|yet))?\b/i, () => { r.electrician = 'missing'; r.hasContractor = true })
  eat(/\b(?:electrician|electrical(?:\s+contractor)?)\s+(?:is\s+)?(?:missing|not (?:on file|named|hired|listed)|needed)\b/i, () => { r.electrician = 'missing'; r.hasContractor = true })
  eat(/\b(?:with|has|have)\s+(?:an?\s+)?(?:electrician|electrical contractor)(?:\s+on file)?\b/i, () => { r.electrician = 'on_file' })
  // contractor named
  eat(/\b(?:contractor|gc|general contractor)s?\s+(?:is\s+|was\s+|already\s+)?(?:named|hired|on file|selected|assigned)\b|\b(?:with|has|have)\s+(?:an?\s+)?(?:contractor|gc|general contractor)(?:\s+named|\s+hired)?\b|\bhired contractors?\b/i, () => { r.hasContractor = true })
  // value
  eat(new RegExp(String.raw`\bbetween\s+${AMT}\s*(?:and|to|-)\s*${AMT}`, 'i'), (m) => { r.minValue = parseAmt(m[1], m[2] || m[4]); r.maxValue = parseAmt(m[3], m[4]) })
  eat(new RegExp(String.raw`\b(?:over|above|more than|greater than|at least|min(?:imum)?|exceeding|>=?|worth over|valued? (?:at )?over)\s*${AMT}\s*(\+)?`, 'i'), (m) => { r.minValue = parseAmt(m[1], m[2]) })
  eat(new RegExp(String.raw`\b(?:under|below|less than|at most|max(?:imum)?|up to|<=?)\s*${AMT}`, 'i'), (m) => { r.maxValue = parseAmt(m[1], m[2]) })
  eat(new RegExp(String.raw`\$\s*([\d][\d,]*\.?\d*)\s*(k|m|mm|b)\s*\+`, 'i'), (m) => { r.minValue = parseAmt(m[1], m[2]) })
  // recency
  eat(/\b(?:in|within|over)?\s*(?:the\s+)?(?:last|past|previous)\s+(\d+)\s*(day|week|month)s?\b/i, (m) => { r.withinDays = +m[1] * (m[2].toLowerCase() === 'day' ? 1 : m[2].toLowerCase() === 'week' ? 7 : 30) })
  eat(/\b(?:filed |issued |posted )?(?:in the |within the )?(?:last|past|this)\s+week\b|\bthis week\b/i, () => { r.withinDays = 7 })
  eat(/\b(?:filed |issued |posted )?(?:this|last|past)\s+month\b/i, () => { r.withinDays = 30 })
  eat(/\b(?:today|yesterday|new today|latest)\b/i, (m) => { r.withinDays = /today|new today/i.test(m[0]) ? 2 : 7; r.sort = 'newest' })
  // sorting
  eat(/\b(?:biggest|largest|highest[- ]value|most valuable)\b/i, () => { r.sort = 'value' })
  eat(/\b(?:newest|most recent)\b/i, () => { r.sort = 'newest' })
  // stage
  eat(/\b(?:early[- ]stage|early|pre[- ]?construction|before (?:the )?(?:first )?permit|years? out|land (?:in|under) planning|in planning|planning stage|land|rezoning|rezone|zoning|re-?zoned|parcels?|vacant lots?|entitlement)s?\b/i, (m) => { r.stages.push(/early|pre|before|years/i.test(m[0]) ? 'Early' : 'Land / Planning') })
  eat(/\b(?:plan review|plan check|in review|under review|filed|filing|filings|pending permits?)\b/i, () => { r.stages.push('Filed / Plan Review') })
  eat(/\b(?:permits? issued|issued permits?|already permitted)\b/i, () => { r.stages.push('Permit Issued') })
  // kinds / category
  eat(/\bnew (?:builds?|construction|buildings?|developments?)\b|\bground[- ]up\b|\bnew-?builds?\b/i, () => r.kinds.push('New Construction'))
  eat(/\b(?:renovations?|remodels?|remodeling|alterations?|retrofits?|rehabs?|refurbish\w*|upgrades?|improvements?)\b/i, () => r.kinds.push('Renovation / Alteration', 'Remodel'))
  eat(/\badditions?\b/i, () => r.kinds.push('Addition'))
  eat(/\b(?:demolitions?|teardowns?|tear[- ]downs?|demo)\b/i, () => r.kinds.push('Demolition'))
  eat(/\b(?:tenant improvements?|ti|build[- ]outs?|fit[- ]outs?)\b/i, () => r.kinds.push('Tenant Improvement'))
  eat(/\b(?:commercial|office|retail|industrial|warehouse|hospitality|hotel|non[- ]residential)\b/i, (m) => { r.category = 'Commercial'; if (/office|retail|industrial|warehouse|hotel/i.test(m[0])) r.keywords.push(m[0].toLowerCase()) })
  eat(/\b(?:residential|single[- ]family|multi[- ]?family|multifamily|apartments?|housing|homes?|houses?|condos?|townhomes?)\b/i, (m) => { r.category = 'Residential'; if (/multi|apartment|condo/i.test(m[0])) r.multifamily = true })
  // quoted keywords
  for (const m of q.matchAll(/"([^"]+)"/g)) r.keywords.push(m[1].toLowerCase())
  q = q.replace(/"[^"]+"/g, ' ')

  const low = ' ' + q.toLowerCase().replace(/[^a-z0-9.\- ]/g, ' ') + ' '
  // counties (longest first)
  for (const c of [...geo.counties].sort((a, b) => b.name.length - a.name.length)) {
    const base = c.name.replace(/ county$/i, '').toLowerCase()
    if (low.includes(` ${base} county `) || low.includes(` ${c.name.toLowerCase()} `)) { r.counties.push(c.name); if (!r.states.includes(c.state)) r.states.push(c.state) }
  }
  // cities
  const lowNoCounty = low.replace(/ [a-z ]+? county /g, ' ')
  for (const c of [...geo.cities].sort((a, b) => b.name.length - a.name.length)) {
    if (lowNoCounty.includes(` ${c.name.toLowerCase()} `) && !r.cities.includes(c.name)) { r.cities.push(c.name); if (!r.states.includes(c.state) && !r.counties.length) r.states.push(c.state) }
  }
  if (/\bnyc\b|new york city/i.test(input) && !r.cities.length) { r.states.push('NY') }
  // states: full names
  for (const [ab, name] of Object.entries(STATES).sort((a, b) => b[1].length - a[1].length)) {
    if (low.includes(` ${name.toLowerCase()} `)) if (!r.states.includes(ab)) r.states.push(ab)
  }
  // abbreviations: only UPPERCASE tokens in original
  for (const m of input.matchAll(/(?:^|[\s,])([A-Z]{2})(?=$|[\s,.])/g)) if (STATES[m[1]] && !r.states.includes(m[1])) r.states.push(m[1])
  if (/\bnyc\b/i.test(input) && !r.states.includes('NY')) r.states.push('NY')
  // free keywords
  for (const k of KEYWORDS) if (low.includes(` ${k} `) && !r.keywords.includes(k)) r.keywords.push(k)
  r.keywords = [...new Set(r.keywords)]
  r.kinds = [...new Set(r.kinds)]; r.stages = [...new Set(r.stages)]
  r.states = [...new Set(r.states)]
  // If a more specific city/county is present and the state was only inferred, keep it (harmless).
  return r
}

export function applyRule(jobs: Job[], r: Rule): Job[] {
  const kw = r.keywords.map((k) => k.toLowerCase())
  const out = jobs.filter((j) => {
    if (r.states.length && !r.states.includes(j.state)) return false
    if (r.counties.length && !r.counties.includes(j.county)) return false
    if (r.cities.length && !r.cities.includes(j.city)) return false
    if (r.minValue != null && !((j.valuation ?? -1) >= r.minValue)) return false
    if (r.maxValue != null && !((j.valuation ?? Infinity) <= r.maxValue)) return false
    if (r.category && j.category !== r.category) {
      if (!(j.category == null && r.category === 'Commercial')) return false
    }
    if (r.kinds.length && !r.kinds.includes(j.kind)) return false
    if (r.stages.length) {
      const ok = r.stages.some((s) => (s === 'Early' ? j.stage !== 'Permit Issued' : j.stage === s))
      if (!ok) return false
    }
    if (r.multifamily && !((j.units ?? 0) >= 2 || /multi|apartment|\bunits\b|dwelling units|condo|mixed[- ]use/i.test(j.description || ''))) return false
    if (r.electrician && j.electrician !== r.electrician) return false
    if (r.hasContractor && !j.contractor) return false
    if (r.withinDays != null && !(j.daysSince != null && j.daysSince <= r.withinDays)) return false
    if (kw.length) { const hay = `${j.description || ''} ${j.address} ${j.kind} ${j.category || ''} ${j.owner || ''} ${j.contractor?.name || ''}`.toLowerCase(); if (!kw.every((k) => hay.includes(k) || (k === 'multifamily' && hay.includes('multi')) || (k === 'apartments' && hay.includes('apartment')))) return false }
    return true
  })
  const sorter = r.sort === 'value' ? (a: Job, b: Job) => (b.valuation || 0) - (a.valuation || 0) : r.sort === 'newest' ? (a: Job, b: Job) => (a.daysSince ?? 9e3) - (b.daysSince ?? 9e3) : (a: Job, b: Job) => (b.score || 0) - (a.score || 0)
  return out.sort(sorter)
}

export interface Chip { id: string; label: string; tone?: 'green' | 'amber' | 'blue' }
export function chips(r: Rule): Chip[] {
  const c: Chip[] = []
  if (r.electrician === 'missing') c.push({ id: 'electrician', label: 'No electrician on file', tone: 'amber' })
  if (r.electrician === 'on_file') c.push({ id: 'electrician', label: 'Electrician on file' })
  if (r.hasContractor && r.electrician !== 'missing') c.push({ id: 'hasContractor', label: 'Contractor named' })
  else if (r.hasContractor) c.push({ id: 'hasContractor', label: 'Contractor named', tone: 'green' })
  r.states.forEach((s) => c.push({ id: `state:${s}`, label: STATES[s] || s, tone: 'blue' }))
  r.counties.forEach((s) => c.push({ id: `county:${s}`, label: s, tone: 'blue' }))
  r.cities.forEach((s) => c.push({ id: `city:${s}`, label: s, tone: 'blue' }))
  if (r.minValue != null) c.push({ id: 'minValue', label: `Value ≥ ${money(r.minValue)}` })
  if (r.maxValue != null) c.push({ id: 'maxValue', label: `Value ≤ ${money(r.maxValue)}` })
  if (r.category) c.push({ id: 'category', label: r.multifamily ? 'Multifamily' : r.category })
  r.kinds.filter((k) => k !== 'Remodel').forEach((k) => c.push({ id: `kind:${k}`, label: k }))
  r.stages.forEach((s) => c.push({ id: `stage:${s}`, label: s === 'Early' ? 'Pre-construction (before permit)' : s }))
  if (r.withinDays != null) c.push({ id: 'withinDays', label: `Last ${r.withinDays} days` })
  r.keywords.forEach((k) => c.push({ id: `kw:${k}`, label: `“${k}”` }))
  if (r.sort) c.push({ id: 'sort', label: r.sort === 'value' ? 'Sorted by value' : 'Newest first' })
  return c
}
export function dropChip(r: Rule, id: string): Rule {
  const n: Rule = JSON.parse(JSON.stringify(r))
  const [k, v] = id.split(/:(.*)/s)
  if (k === 'electrician') delete n.electrician
  else if (k === 'hasContractor') delete n.hasContractor
  else if (k === 'state') n.states = n.states.filter((x) => x !== v)
  else if (k === 'county') n.counties = n.counties.filter((x) => x !== v)
  else if (k === 'city') n.cities = n.cities.filter((x) => x !== v)
  else if (k === 'minValue') delete n.minValue
  else if (k === 'maxValue') delete n.maxValue
  else if (k === 'category') { delete n.category; delete n.multifamily }
  else if (k === 'kind') { n.kinds = n.kinds.filter((x) => x !== v); if (v === 'Renovation / Alteration') n.kinds = n.kinds.filter((x) => x !== 'Remodel') }
  else if (k === 'stage') n.stages = n.stages.filter((x) => x !== v)
  else if (k === 'withinDays') delete n.withinDays
  else if (k === 'kw') n.keywords = n.keywords.filter((x) => x !== v)
  else if (k === 'sort') delete n.sort
  return n
}
export const isEmptyRule = (r: Rule) => chips(r).length === 0
