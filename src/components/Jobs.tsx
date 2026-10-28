import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Job } from '../types'
import { fmtDate, money } from '../lib/geo'
import { slug } from '../lib/data'
import { useUI } from '../lib/ui'
import { Mail, Ext, Pin, X, Bolt, Phone } from './Icons'

export const ElecBadge = ({ j }: { j: Job }) =>
  j.hot ? <span className="badge hot"><Bolt /> Contractor hired · electrician missing</span>
    : j.electrician === 'on_file' ? <span className="badge ok">Electrician on file</span>
    : j.stage === 'Land / Planning' ? <span className="badge land">Land in planning</span>
    : j.contractor ? <span className="badge neutral">Contractor named</span>
    : <span className="badge neutral">No contractor yet</span>

export function JobRow({ j, showLoc = true }: { j: Job; showLoc?: boolean }) {
  const { openDraft, openDetail } = useUI()
  const canEmail = !!(j.contractor || j.owner || j.applicant)
  return (
    <article className={`job ${j.hot ? 'is-hot' : ''}`}>
      <div className="job-main" onClick={() => openDetail(j)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openDetail(j)}>
        <div className="job-top"><ElecBadge j={j} /><span className="stage">{j.stage}</span><span className="window">{j.window}</span></div>
        <h4>{j.address}</h4>
        <div className="job-meta">
          {showLoc && <span><Pin /> {j.city}, {j.state} · {j.county}</span>}
          <span>{j.kind}</span>
          {j.category && <span>{j.category}</span>}
          {j.valuation != null && <span className="val">{money(j.valuation)}</span>}
          {j.units ? <span>{j.units} units</span> : null}
        </div>
        {j.description && <p className="job-desc">{j.description}</p>}
        <div className="job-who">
          {j.contractor ? <span><b>{j.contractor.role?.includes('GC') || /general/i.test(j.contractor.role || '') ? 'GC' : j.contractor.role}:</b> {j.contractor.name}{j.contractor.phone ? ` · ${fmtPhone(j.contractor.phone)}` : ''}</span> : j.applicant || j.owner ? <span><b>{j.applicant ? 'Applicant' : 'Owner'}:</b> {j.applicant || j.owner}</span> : null}
          <span className="date">{j.issuedDate ? `Issued ${fmtDate(j.issuedDate)}` : j.filedDate ? `${j.stage === 'Land / Planning' ? 'Milestone' : 'Filed'} ${fmtDate(j.filedDate)}` : ''}</span>
        </div>
      </div>
      <div className="job-actions">
        {canEmail && <button className="btn btn-primary btn-sm" onClick={() => openDraft(j)}><Mail /> {j.contractor ? 'Intro email' : 'Email owner'}</button>}
        <button className="btn btn-ghost btn-sm" onClick={() => openDetail(j)}>Details</button>
      </div>
    </article>
  )
}
export const fmtPhone = (p: string) => { const d = p.replace(/\D/g, ''); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p }

export function JobList({ jobs, showLoc = true, pageSize = 40 }: { jobs: Job[]; showLoc?: boolean; pageSize?: number }) {
  const [n, setN] = useState(pageSize)
  const slice = useMemo(() => jobs.slice(0, n), [jobs, n])
  if (!jobs.length) return <div className="empty"><h4>No matching jobs</h4><p>Try loosening a rule — remove a chip above, or search a different area.</p></div>
  return (
    <div className="joblist">
      {slice.map((j) => <JobRow key={j.id} j={j} showLoc={showLoc} />)}
      {n < jobs.length && <button className="btn btn-ghost more" onClick={() => setN(n + pageSize)}>Show {Math.min(pageSize, jobs.length - n)} more of {jobs.length - n} remaining</button>}
    </div>
  )
}

export function DetailDrawer() {
  const { detail: j, openDetail, openDraft } = useUI()
  if (!j) return null
  const sourceLabel: Record<string, string> = { chicago: 'City of Chicago Building Permits', austin: 'City of Austin Issued Construction Permits', 'nyc-permits': 'NYC DOB NOW: Build Approved Permits', 'nyc-filings': 'NYC DOB NOW: Build Job Application Filings', 'nyc-zap': 'NYC Zoning Application Portal (ZAP)', seattle: 'City of Seattle Building Permits', sf: 'San Francisco Building Permits', la: 'LADBS Building Permits Submitted' }
  const rows: [string, React.ReactNode][] = [
    ['Stage', j.stage], ['Est. timing', j.window], ['Status', j.status || '—'], ['Type', `${j.kind}${j.category ? ' · ' + j.category : ''}`], ['Valuation', money(j.valuation)],
    ['Permit / record #', j.permitNo || '—'], ['Filed / milestone', fmtDate(j.filedDate)], ['Issued', fmtDate(j.issuedDate)], ['Owner', j.owner || '—'], ['Applicant', j.applicant || '—'],
    ['Contractor', j.contractor ? `${j.contractor.name} (${j.contractor.role || 'Contractor'})` : 'Not yet named'], ['Contractor contact', j.contractor ? [j.contractor.contact, j.contractor.phone && fmtPhone(j.contractor.phone)].filter(Boolean).join(' · ') || '—' : '—'],
    ['Electrician', j.electrician === 'missing' ? 'Not on file (no electrical contact/permit found)' : j.electrician === 'on_file' ? 'On file' : 'Unknown — source has no trade data'],
    ['Other trades named', j.trades?.length ? j.trades.join(', ') : '—'],
  ]
  return (
    <div className="overlay" onClick={() => openDetail(null)}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <button className="icon-btn close" onClick={() => openDetail(null)} aria-label="Close"><X /></button>
        <ElecBadge j={j} />
        <h3>{j.address}</h3>
        <p className="muted"><Link to={`/directory/${j.state}/${slug(j.county)}/${slug(j.city)}`} onClick={() => openDetail(null)}>{j.city}, {j.state}</Link> · {j.county}</p>
        {j.description && <p className="desc">{j.description}</p>}
        <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <div className="drawer-actions">
          {(j.contractor || j.owner || j.applicant) && <button className="btn btn-primary" onClick={() => { openDetail(null); openDraft(j) }}><Mail /> {j.contractor ? 'Create intro email' : 'Email owner / applicant'}</button>}
          {j.contractor?.phone && <a className="btn btn-ghost" href={`tel:${j.contractor.phone}`}><Phone /> Call contractor</a>}
          {j.link && <a className="btn btn-ghost" href={j.link} target="_blank" rel="noreferrer"><Ext /> Source record</a>}
          {j.lat != null && <a className="btn btn-ghost" href={`https://www.google.com/maps?q=${j.lat},${j.lon}`} target="_blank" rel="noreferrer"><Pin /> Map</a>}
        </div>
        <p className="src">Source: {sourceLabel[j.source] || j.source} — real public record. Record ID {j.id}.</p>
      </aside>
    </div>
  )
}
