import { useData } from '../lib/data'
import { ago } from '../lib/geo'
import { Ext } from '../components/Icons'

const NOTES: Record<string, { signal: string; contractor: string; kind: string }> = {
  chicago: { signal: 'Issued permits (new construction, renovation, demolition) ≥ $100K, last 60 days', contractor: 'Yes — General Contractor and every other trade contact on the permit; “electrician missing” = no electrical contractor contact on the permit', kind: 'Real' },
  austin: { signal: 'Issued building permits (new, addition, remodel), last 45 days', contractor: 'Yes — contractor name & phone; “electrician missing” = no electrical permit (EP) found for the same project/address', kind: 'Real' },
  'nyc-permits': { signal: 'Issued General Construction permits ≥ $100K, last 45 days', contractor: 'Yes — GC permittee; “electrician missing” = no DOB NOW electrical filing for the same building (BIN) in the last 12 months', kind: 'Real' },
  'nyc-filings': { signal: 'Job filings ≥ $500K in plan review / approved, last 180 days', contractor: 'No — applicant/owner only (contractor not yet hired)', kind: 'Real' },
  'nyc-zap': { signal: 'Active zoning & land-use applications (rezonings, special permits, ULURP)', contractor: 'No — applicant/owner only', kind: 'Real' },
  seattle: { signal: 'Building permit applications ≥ $500K not yet issued, last 240 days', contractor: 'No — dataset has no contractor field before issuance', kind: 'Real' },
  sf: { signal: 'Building permit applications ≥ $500K filed / in review, not yet issued, last 240 days', contractor: 'No — dataset has no contractor field', kind: 'Real' },
  la: { signal: 'LADBS submitted permits ≥ $500K in plan check, not yet issued, last 240 days', contractor: 'No — dataset has no contractor field', kind: 'Real' },
}

export function CoveragePage() {
  const { meta, loading } = useData()
  return (
    <div className="wrap page">
      <h1>Coverage &amp; data</h1>
      <p className="lede">Every record in Parcelopoly is pulled from a government open-data portal by a daily job. Nothing is invented — if a source is down, the last good pull is kept and flagged here.</p>
      {meta && <p className="muted">Last pipeline run: <b>{new Date(meta.generatedAt).toLocaleString()}</b> ({ago(meta.generatedAt)}) · {meta.total.toLocaleString()} records</p>}
      {loading && <p className="muted">Loading…</p>}
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Source</th><th>Area</th><th>What we pull</th><th>Contractor / electrician data</th><th>Data</th><th>Records</th></tr></thead>
        <tbody>
          {meta?.sources.map((s) => (
            <tr key={s.key}>
              <td><a href={s.url} target="_blank" rel="noreferrer">{s.name} <Ext /></a></td><td>{s.coverage}</td><td>{NOTES[s.key]?.signal}</td><td>{NOTES[s.key]?.contractor}</td>
              <td>{s.ok ? <span className="badge ok">Real · live</span> : <span className="badge warn" title={s.error}>Last pull failed</span>}</td><td>{s.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <h3 className="sec">What “electrician missing” means</h3>
      <p>We flag a job when a contractor is named on a public permit record and we cannot find an electrical contractor or electrical permit for the same project. It’s a strong lead, not proof — the electrician may be hired later, listed under a separate filing, or covered by the GC’s own crew. Always confirm before you call.</p>
      <h3 className="sec">Timing estimates</h3>
      <p>“12–24 months out”, “3–12 months out” and “starts in ~1 week” are heuristic estimates based on the filing stage — not dates published by the city.</p>
      <h3 className="sec">Emails</h3>
      <p>Public permit records generally don’t include email addresses. The intro email composer pre-fills everything else; add the recipient’s email (or call the phone number where the record provides one).</p>
      <h3 className="sec">Roadmap</h3>
      <p>The pipeline is source-driven (<code>scripts/fetch-data.mjs</code>). Adding another Socrata city or county permit portal is a single function. Counties without a free open-data feed (many rely on paid or login-gated portals) are shown as “Coming soon” in the directory.</p>
    </div>
  )
}
