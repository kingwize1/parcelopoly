// Parcelopoly daily pipeline. Pulls REAL public records from open-data (Socrata) portals.
// No API keys required. Never fabricates records: if a source fails it is reported in meta.json and skipped.
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('public/data')
fs.mkdirSync(OUT, { recursive: true })
const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 864e5).toISOString().slice(0, 10)
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null }
const title = (s) => (s || '').toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\s+/g, ' ').trim()
const clean = (s) => (s || '').replace(/\*{2,}[^*]*\*{2,}/g, ' ').replace(/\s+/g, ' ').trim()
const dateOnly = (s) => (s ? String(s).slice(0, 10) : null)

async function soda(domain, id, params, tries = 3) {
  const url = new URL(`https://${domain}/resource/${id}.json`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(120000), redirect: 'follow' })
      if (!r.ok) throw new Error(`${r.status} ${await r.text().then((t) => t.slice(0, 120))}`)
      return await r.json()
    } catch (e) {
      if (i === tries - 1) throw e
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
    }
  }
}

const mkJob = (o) => ({
  contractor: null, electrician: 'unknown', owner: null, applicant: null, valuation: null, units: null, sqft: null,
  lat: null, lon: null, issuedDate: null, filedDate: null, ...o,
})
const cap = (j) => ({ ...j, description: j.description && j.description.length > 320 ? j.description.slice(0, 317) + '…' : j.description, lat: j.lat != null ? +j.lat.toFixed(5) : null, lon: j.lon != null ? +j.lon.toFixed(5) : null })

// ---------- Chicago (Cook County, IL) — Building Permits, contacts list trades on the permit ----------
async function chicago() {
  const rows = await soda('data.cityofchicago.org', 'ydr8-5enu', {
    $where: `issue_date >= '${daysAgo(60)}' AND reported_cost >= 100000 AND (permit_type='PERMIT - NEW CONSTRUCTION' OR permit_type='PERMIT - RENOVATION/ALTERATION' OR permit_type='PERMIT - WRECKING/DEMOLITION')`,
    $limit: 3000, $order: 'issue_date DESC',
  })
  return rows.map((r) => {
    const contacts = []
    for (let i = 1; i <= 20; i++) if (r[`contact_${i}_type`]) contacts.push({ type: r[`contact_${i}_type`], name: r[`contact_${i}_name`], city: r[`contact_${i}_city`], state: r[`contact_${i}_state`] })
    const gc = contacts.find((c) => /GENERAL CONTRACTOR/.test(c.type))
    const hasElec = contacts.some((c) => /ELECTRIC/.test(c.type))
    const owner = contacts.find((c) => c.type === 'OWNER')
    const t = r.permit_type
    const addr = clean(`${r.street_number} ${r.street_direction || ''} ${r.street_name}`)
    return mkJob({
      id: `chi-${r.permit_}`, source: 'chicago', state: 'IL', county: 'Cook County', city: 'Chicago', address: title(addr),
      kind: /NEW CONSTRUCTION/.test(t) ? 'New Construction' : /DEMOLITION/.test(t) ? 'Demolition' : 'Renovation / Alteration',
      stage: 'Permit Issued', status: title(r.permit_milestone || r.permit_status), description: clean(r.work_description),
      valuation: num(r.reported_cost), lat: num(r.latitude), lon: num(r.longitude), issuedDate: dateOnly(r.issue_date), filedDate: dateOnly(r.application_start_date),
      permitNo: r.permit_, link: 'https://webapps1.chicago.gov/buildingrecords/',
      contractor: gc ? { name: title(gc.name), role: 'General Contractor', city: title(gc.city), state: gc.state, phone: null } : null,
      owner: owner ? title(owner.name) : null,
      electrician: gc ? (hasElec ? 'on_file' : 'missing') : 'unknown',
      trades: contacts.filter((c) => /CONTRACTOR/.test(c.type)).map((c) => c.type.replace('CONTRACTOR-', '').toLowerCase()),
    })
  })
}

// ---------- Austin (Travis County, TX) — Issued Construction Permits; BP vs EP by master permit ----------
async function austin() {
  const D = 'data.austintexas.gov', ID = '3syk-w9eu'
  const bps = await soda(D, ID, {
    $where: `permittype='BP' AND issue_date >= '${daysAgo(45)}' AND (work_class='New' OR work_class='Addition' OR work_class='Addition and Remodel' OR work_class='Remodel')`,
    $limit: 3000, $order: 'issue_date DESC',
  })
  const eps = await soda(D, ID, { $select: 'permit_number,permit_location,masterpermitnum', $where: `permittype='EP' AND (issue_date >= '${daysAgo(240)}' OR applieddate >= '${daysAgo(240)}')`, $limit: 50000 })
  // Trade permits of one project share the permit-number stem (e.g. "2026-129655 BP" / "2026-129655 EP") and point at the BP project_id via masterpermitnum.
  const stem = (n) => String(n || '').replace(/\s+[A-Z]{2}$/, '')
  const epSet = new Set(), epStem = new Set(), epAddr = new Set()
  for (const e of eps) { if (e.masterpermitnum) epSet.add(e.masterpermitnum); epStem.add(stem(e.permit_number)); if (e.permit_location) epAddr.add(e.permit_location.toUpperCase().replace(/\s+/g, ' ').trim()) }
  return bps.map((r) => {
    const gc = r.contractor_company_name ? r : null
    const isRes = /Resid/i.test(r.permit_class_mapped || '')
    return mkJob({
      id: `aus-${r.permit_number.replace(/\W+/g, '-')}`, source: 'austin', state: 'TX', county: 'Travis County', city: title(r.original_city || 'Austin'),
      address: title(r.original_address1 || r.permit_location), category: isRes ? 'Residential' : 'Commercial',
      kind: r.work_class === 'New' ? 'New Construction' : /Addition/.test(r.work_class) ? 'Addition' : 'Remodel',
      stage: 'Permit Issued', status: r.status_current, description: clean(r.description),
      valuation: num(r.total_job_valuation) || null, sqft: num(r.total_new_add_sqft), units: num(r.housing_units),
      lat: num(r.latitude), lon: num(r.longitude), issuedDate: dateOnly(r.issue_date), filedDate: dateOnly(r.applieddate),
      permitNo: r.permit_number, link: r.link?.url,
      contractor: gc ? { name: clean(r.contractor_company_name), role: r.contractor_trade || 'General Contractor', contact: clean(r.contractor_full_name), phone: r.contractor_phone || null, city: title(r.contractor_city) } : null,
      electrician: gc ? (epSet.has(r.project_id) || epSet.has(r.masterpermitnum) || epStem.has(stem(r.permit_number)) || epAddr.has(String(r.permit_location || '').toUpperCase().replace(/\s+/g, ' ').trim()) ? 'on_file' : 'missing') : 'unknown',
    })
  })
}

// ---------- NYC (5 boroughs = 5 counties) ----------
const NYC_COUNTY = { MANHATTAN: 'New York County', BROOKLYN: 'Kings County', QUEENS: 'Queens County', BRONX: 'Bronx County', 'STATEN ISLAND': 'Richmond County' }
async function nycPermits() {
  const rows = await soda('data.cityofnewyork.us', 'rbx6-tga4', {
    $where: `issued_date >= '${daysAgo(45)}' AND work_type='General Construction' AND permittee_s_license_type='GC'`,
    $limit: 15000, $order: 'issued_date DESC',
  })
  const el = await soda('data.cityofnewyork.us', 'dm9a-ab7w', { $select: 'bin', $where: `filing_date >= '${daysAgo(365)}' AND bin IS NOT NULL`, $group: 'bin', $limit: 100000 })
  const elSet = new Set(el.map((e) => e.bin))
  const seen = new Set()
  return rows.filter((r) => num(r.estimated_job_costs) >= 100000).filter((r) => { if (seen.has(r.job_filing_number)) return false; seen.add(r.job_filing_number); return true }).map((r) => {
    const b = (r.borough || '').toUpperCase()
    const owner = clean(r.owner_business_name || r.owner_name)
    return mkJob({
      id: `nyc-${r.job_filing_number}`, source: 'nyc-permits', state: 'NY', county: NYC_COUNTY[b] || 'New York County', city: title(b === 'STATEN ISLAND' ? 'Staten Island' : b || 'New York'),
      address: title(`${r.house_no} ${r.street_name}`), kind: /demol/i.test(r.job_description || '') ? 'Demolition' : 'Renovation / Alteration', stage: 'Permit Issued', status: 'GC permit issued',
      description: clean(r.job_description), valuation: num(r.estimated_job_costs), lat: num(r.latitude), lon: num(r.longitude),
      issuedDate: dateOnly(r.issued_date), filedDate: dateOnly(r.approved_date), permitNo: r.job_filing_number, link: 'https://a810-dobnow.nyc.gov/publish/Index.html#!/',
      contractor: r.applicant_business_name ? { name: title(r.applicant_business_name), role: 'General Contractor (GC permittee)', contact: title(`${r.applicant_first_name || ''} ${r.applicant_last_name || ''}`), phone: null, city: null } : null,
      owner: owner ? title(owner) : null,
      electrician: r.bin ? (elSet.has(r.bin) ? 'on_file' : 'missing') : 'unknown',
    })
  })
}
async function nycFilings() {
  const rows = await soda('data.cityofnewyork.us', 'w9ak-ipjd', {
    $where: `filing_date >= '${daysAgo(180)}' AND (job_type='New Building' OR job_type='Alteration' OR job_type='Alteration CO') AND (filing_status='Approved' OR filing_status='Permit Entire' OR filing_status='LOC Issued' OR filing_status='Under Review' OR filing_status='Initial Submitted' OR filing_status='In Review' OR filing_status='Objections')`,
    $limit: 20000, $order: 'filing_date DESC',
  })
  return rows.filter((r) => num(r.initial_cost) >= 500000).map((r) => {
    const b = (r.borough || '').toUpperCase()
    return mkJob({
      id: `nycf-${r.job_filing_number}`, source: 'nyc-filings', state: 'NY', county: NYC_COUNTY[b] || 'New York County', city: title(b === 'STATEN ISLAND' ? 'Staten Island' : b),
      address: title(`${r.house_no} ${r.street_name}`), kind: r.job_type === 'New Building' ? 'New Construction' : 'Renovation / Alteration',
      stage: 'Filed / Plan Review', status: r.filing_status, description: clean(r.job_description), valuation: num(r.initial_cost),
      units: num(r.proposed_dwelling_units), lat: num(r.latitude), lon: num(r.longitude), filedDate: dateOnly(r.filing_date), permitNo: r.job_filing_number,
      link: 'https://a810-dobnow.nyc.gov/publish/Index.html#!/', owner: title(clean(r.owner_s_business_name)) || null,
      applicant: title(clean(r.applicant_business_name)) || null, category: /Residential|Dwelling|Hotel/i.test(r.building_type || '') || num(r.proposed_dwelling_units) > 0 ? 'Residential' : 'Commercial',
    })
  })
}
async function nycZap() {
  const rows = await soda('data.cityofnewyork.us', 'hgx4-8ukb', { $where: `project_status='Active'`, $limit: 1000, $order: 'current_milestone_date DESC' })
  return rows.map((r) => {
    const b = (r.borough || '').toUpperCase()
    const brief = clean(r.project_brief)
    const du = /(\d[\d,]*)\s*(?:DUs|dwelling units|units)/i.exec(brief)
    return mkJob({
      id: `zap-${r.project_id}`, source: 'nyc-zap', state: 'NY', county: NYC_COUNTY[b] || 'New York County', city: title(b),
      address: clean(r.project_name), kind: 'Rezoning / Land Use', stage: 'Land / Planning', status: `${r.public_status || ''} · ${r.current_milestone || ''}`.replace(/^ · /, ''),
      description: brief, units: du ? num(du[1].replace(/,/g, '')) : null, filedDate: dateOnly(r.current_milestone_date), permitNo: r.project_id,
      link: `https://zap.planning.nyc.gov/projects/${r.project_id}`, applicant: clean(r.primary_applicant) || null, owner: clean(r.primary_applicant) || null,
      category: /residential|DUs|dwelling|housing/i.test(brief) ? 'Residential' : 'Commercial', meta: { actions: r.actions, ulurp: r.ulurp_non },
    })
  })
}

// ---------- Seattle (King County, WA) ----------
async function seattle() {
  const rows = await soda('data.seattle.gov', '76t5-zqzr', {
    $where: `applieddate >= '${daysAgo(240)}' AND estprojectcost >= 500000 AND issueddate IS NULL AND permittypemapped='Building' AND statuscurrent NOT IN ('Canceled','Withdrawn','Expired','Completed','Closed','Denied')`,
    $limit: 2000, $order: 'applieddate DESC',
  })
  return rows.map((r) => mkJob({
    id: `sea-${r.permitnum}`, source: 'seattle', state: 'WA', county: 'King County', city: 'Seattle', address: title(r.originaladdress1),
    category: /Single|Resid/i.test(r.permitclass || '') ? 'Residential' : (num(r.housingunitsadded) > 0 ? 'Residential' : 'Commercial'),
    kind: /New/i.test(r.permittypedesc || '') ? 'New Construction' : /Tenant/i.test(r.permittypedesc || '') ? 'Tenant Improvement' : 'Renovation / Alteration',
    stage: 'Filed / Plan Review', status: r.statuscurrent, description: clean(r.description), valuation: num(r.estprojectcost), units: num(r.housingunitsadded) || null,
    lat: num(r.latitude), lon: num(r.longitude), filedDate: dateOnly(r.applieddate), permitNo: r.permitnum, link: r.link?.url,
  }))
}

// ---------- San Francisco (SF County, CA) ----------
async function sf() {
  const rows = await soda('data.sfgov.org', 'i98e-djp9', {
    $where: `filed_date >= '${daysAgo(240)}' AND (status='filed' OR status='plancheck' OR status='approved' OR status='review' OR status='triage' OR status='incomplete') AND issued_date IS NULL`,
    $limit: 20000, $order: 'filed_date DESC',
  })
  return rows.filter((r) => num(r.estimated_cost) >= 500000).map((r) => mkJob({
    id: `sf-${r.permit_number}`, source: 'sf', state: 'CA', county: 'San Francisco County', city: 'San Francisco',
    address: title(`${r.street_number || ''} ${r.street_name || ''} ${r.street_suffix || ''}`), kind: /new construction/i.test(r.permit_type_definition || '') ? 'New Construction' : /demolition/i.test(r.permit_type_definition || '') ? 'Demolition' : /additions/i.test(r.permit_type_definition || '') ? 'Addition' : 'Renovation / Alteration',
    category: num(r.proposed_units) > 0 && /dwelling|apartment|residential/i.test(r.proposed_use || '') ? 'Residential' : 'Commercial',
    stage: 'Filed / Plan Review', status: title(r.status), description: clean(r.description), valuation: num(r.estimated_cost), units: num(r.proposed_units),
    lat: num(r.location?.coordinates?.[1]), lon: num(r.location?.coordinates?.[0]), filedDate: dateOnly(r.filed_date), permitNo: r.permit_number,
    link: `https://dbiweb02.sfgov.org/dbipts/default.aspx?page=Permit&PermitNumber=${r.permit_number}`,
  }))
}

// ---------- Los Angeles (LA County, CA) ----------
async function la() {
  const rows = await soda('data.lacity.org', 'gwh9-jnip', {
    $where: `submitted_date >= '${daysAgo(240)}' AND permit_group='Building' AND issue_date IS NULL AND status_desc NOT IN ('Permit Finaled','Permit Closed','CofO Issued','CofO in Progress','Refund in Progress')`,
    $limit: 20000, $order: 'submitted_date DESC',
  })
  return rows.filter((r) => num(r.valuation) >= 500000).map((r) => mkJob({
    id: `la-${r.permit_nbr}`, source: 'la', state: 'CA', county: 'Los Angeles County', city: 'Los Angeles', address: title(r.primary_address),
    kind: /new/i.test(r.permit_type || '') ? 'New Construction' : /demol/i.test(r.permit_type || '') ? 'Demolition' : /addition/i.test(r.permit_type || '') ? 'Addition' : 'Renovation / Alteration',
    category: /family|dwelling|apartment|duplex/i.test(r.permit_sub_type || r.use_desc || '') ? 'Residential' : 'Commercial',
    stage: 'Filed / Plan Review', status: r.status_desc, description: clean(r.work_desc), valuation: num(r.valuation), sqft: num(r.square_footage), units: num(r.du_changed) || null,
    lat: num(r.lat), lon: num(r.lon), filedDate: dateOnly(r.submitted_date), permitNo: r.permit_nbr, link: 'https://www.ladbsservices2.lacity.org/OnlineServices/PermitReport/PcisPermitDetail',
  }))
}

const SOURCES = [
  { key: 'chicago', name: 'City of Chicago — Building Permits', url: 'https://data.cityofchicago.org/d/ydr8-5enu', coverage: 'Chicago, IL (Cook County)', fn: chicago },
  { key: 'austin', name: 'City of Austin — Issued Construction Permits', url: 'https://data.austintexas.gov/d/3syk-w9eu', coverage: 'Austin, TX (Travis County)', fn: austin },
  { key: 'nyc-permits', name: 'NYC DOB NOW: Build — Approved Permits + Electrical Permit Applications', url: 'https://data.cityofnewyork.us/d/rbx6-tga4', coverage: 'New York City, NY (5 counties)', fn: nycPermits },
  { key: 'nyc-filings', name: 'NYC DOB NOW: Build — Job Application Filings', url: 'https://data.cityofnewyork.us/d/w9ak-ipjd', coverage: 'New York City, NY (5 counties)', fn: nycFilings },
  { key: 'nyc-zap', name: 'NYC Planning — Zoning Application Portal (ZAP) Project Data', url: 'https://data.cityofnewyork.us/d/hgx4-8ukb', coverage: 'New York City, NY (5 counties)', fn: nycZap },
  { key: 'seattle', name: 'City of Seattle — Building Permits', url: 'https://data.seattle.gov/d/76t5-zqzr', coverage: 'Seattle, WA (King County)', fn: seattle },
  { key: 'sf', name: 'City & County of San Francisco — Building Permits', url: 'https://data.sfgov.org/d/i98e-djp9', coverage: 'San Francisco, CA', fn: sf },
  { key: 'la', name: 'City of Los Angeles — Building Permits Submitted (LADBS)', url: 'https://data.lacity.org/d/gwh9-jnip', coverage: 'Los Angeles, CA (LA County)', fn: la },
]

const MIN_VAL = 100000
async function main() {
  let jobs = [], meta = []
  const prev = fs.existsSync(path.join(OUT, 'jobs.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'jobs.json'), 'utf8')) : null
  for (const s of SOURCES) {
    try {
      const out = await s.fn()
      jobs.push(...out)
      meta.push({ key: s.key, name: s.name, url: s.url, coverage: s.coverage, ok: true, count: out.length })
      console.log(`✓ ${s.key}: ${out.length}`)
    } catch (e) {
      // keep last good data for this source rather than inventing anything
      const kept = prev ? prev.jobs.filter((j) => j.source === s.key) : []
      jobs.push(...kept)
      meta.push({ key: s.key, name: s.name, url: s.url, coverage: s.coverage, ok: false, count: kept.length, error: String(e.message || e).slice(0, 200), note: 'fetch failed; kept previous run data' })
      console.warn(`✗ ${s.key}: ${e.message}`)
    }
  }
  jobs = jobs.map(cap).filter((j) => j.address && (j.stage === 'Land / Planning' || (j.valuation || 0) >= MIN_VAL || j.valuation == null))
  const ok = meta.filter((m) => m.ok).length
  if (!ok && prev) { console.error('All sources failed; leaving existing data untouched'); process.exit(1) }
  const stamp = new Date().toISOString()
  fs.writeFileSync(path.join(OUT, 'jobs.json'), JSON.stringify({ generatedAt: stamp, jobs }))
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ generatedAt: stamp, total: jobs.length, sources: meta }, null, 1))
  console.log(`Wrote ${jobs.length} jobs from ${ok}/${SOURCES.length} sources`)
}
main()
