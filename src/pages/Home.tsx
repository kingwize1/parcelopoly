import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SalesButton } from '../components/Chrome'
import { EXAMPLES, RuleInput } from '../components/Opportunities'
import { JobRow } from '../components/Jobs'
import { useData, tally, slug } from '../lib/data'
import { applyRule, buildGeo, parseRule } from '../lib/nlp'
import { STATES, ago, money } from '../lib/geo'
import { Arrow, Bolt, Layers, Mail, Search } from '../components/Icons'
import { SALES } from '../config'

export function Home() {
  const { jobs, meta, loading } = useData()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const go = (s = q) => nav(`/search${s.trim() ? `?q=${encodeURIComponent(s)}` : ''}`)
  const hot = jobs.filter((j) => j.hot)
  const land = jobs.filter((j) => j.stage === 'Land / Planning')
  const counties = new Set(jobs.map((j) => j.state + j.county)).size
  const states = tally(jobs, (j) => j.state)
  const demo = useMemo(() => (jobs.length ? applyRule(jobs, parseRule(EXAMPLES[0], buildGeo(jobs))) : []), [jobs])
  const top = [...hot].sort((a, b) => (b.valuation || 0) - (a.valuation || 0)).slice(0, 5)
  const n = (x: number) => (loading ? '—' : x.toLocaleString())
  return (
    <>
      <section className="hero">
        <div className="wrap hero-in">
          <div className="hero-copy">
            <span className="eyebrow-pill">FOR ELECTRICAL &amp; TRADE CONTRACTORS</span>
            <h1>See the job<br />before the crew<br /><em>shows up.</em></h1>
            <p className="hero-sub">Parcelopoly reads public permits, filings and planning records every day and surfaces construction <b>6 months to 2 years before groundbreaking</b> — including contractors who were just hired with <b>no electrician on file</b>.</p>
            <div className="hero-ctas">
              <Link className="btn btn-primary btn-lg" to="/search?q=contractor%20hired%2C%20no%20electrician">See jobs missing an electrician <Arrow /></Link>
              <SalesButton className="btn btn-outline btn-lg" />
            </div>
            <p className="hero-call">Or call <a href={SALES.tel}>{SALES.display}</a></p>
            <div className="stats">
              <div><b>{n(jobs.length)}</b><span>upcoming jobs tracked</span></div>
              <div><b>{n(hot.length)}</b><span>contractor hired · no electrician</span></div>
              <div><b>{n(land.length)}</b><span>land &amp; rezonings in planning</span></div>
              <div><b>{n(counties)}</b><span>counties covered today</span></div>
            </div>
          </div>
          <div className="preview">
            <div className="preview-bar"><i /><i /><i /><span>Rules in plain English</span><em>live data</em></div>
            <div className="preview-body">
              <p className="bubble you">{EXAMPLES[0]}</p>
              <p className="bubble bot">Understood — filtering to <b>commercial</b> jobs <b>≥ $1M</b> in <b>Travis County, TX</b> where a contractor is named and <b>no electrician</b> is on file.</p>
              <button className="bubble result" onClick={() => go(EXAMPLES[0])}>Run this rule — {demo.length.toLocaleString()} matches today <Arrow /></button>
              <div className="mini-list">
                {demo.slice(0, 3).map((j) => (
                  <div key={j.id} className="mini"><Bolt /><div><b>{j.address}</b><span>{j.city}, {j.state} · {money(j.valuation)} · {j.contractor?.name}</span></div></div>
                ))}
              </div>
            </div>
            <RuleInput big value={q} onChange={setQ} onSubmit={() => go()} placeholder="Search by area, value, trade, stage…" />
            <p className="preview-note">{meta ? `Records refreshed ${ago(meta.generatedAt)}` : 'Loading latest records…'}</p>
          </div>
        </div>
      </section>

      <section className="strip">
        <div className="wrap strip-in"><span>READING PUBLIC RECORDS FROM</span>{['New York City DOB & Planning', 'Chicago Building Permits', 'Austin Development Services', 'Seattle SDCI', 'San Francisco DBI', 'Los Angeles LADBS'].map((s) => <b key={s}>{s}</b>)}</div>
      </section>

      <section className="sec-light timeline-sec">
        <div className="wrap">
          <span className="eyebrow">THE WINDOW</span>
          <h2>The permit is the starting gun.<br />You want to be there <span className="g">before</span> it.</h2>
          <p className="lede">Bid boards only show public work. Private projects leave a trail in public records long before a crew is on site — Parcelopoly follows that trail.</p>
          <div className="tl">
            {[
              ['Land & rezoning', '12–24 months out', 'Zoning applications and land-use filings show who is assembling a site and what they plan to build.', 'Land / Planning'],
              ['Plan review', '3–12 months out', 'Building applications filed with the city — owner, scope and valuation are public before permits issue.', 'Filed / Plan Review'],
              ['Contractor named', '~1 week before work', 'The permit issues and a GC is on record. If no electrician is listed, that scope is still open. Call first.', 'Permit Issued'],
            ].map(([t, w, d, st], i) => (
              <div key={t} className={`tl-card ${i === 2 ? 'hot' : ''}`}>
                <span className="tl-num">{i + 1}</span><em>{w}</em><h4>{t}</h4><p>{d}</p>
                <b>{n(jobs.filter((j) => j.stage === st).length)} live records</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="sec-cream">
        <div className="wrap">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>From public record to booked call.</h2>
          <div className="cards3">
            <div className="fcard"><span className="ico"><Layers /></span><h4>We read the records every day</h4><p>A daily pipeline pulls permits, plan-review filings and zoning applications from city and county open-data portals and normalizes them into one directory.</p></div>
            <div className="fcard"><span className="ico"><Search /></span><h4>Set your rules in plain English</h4><p>“New commercial builds over $1M in Travis County with no electrician.” Parcelopoly turns it into filters instantly — no forms, no code.</p></div>
            <div className="fcard"><span className="ico"><Mail /></span><h4>One click to a ready-to-send intro</h4><p>Open any job with a named contractor and get a populated email — subject, body, project details and your signature — in a compose box.</p></div>
          </div>
        </div>
      </section>

      <section className="sec-light">
        <div className="wrap">
          <div className="sec-head"><div><span className="eyebrow">CALL FIRST</span><h2>Contractor hired. Electrician missing.</h2><p className="lede">Largest open electrical scopes from the latest pull.</p></div><Link className="btn btn-ghost" to="/search?q=contractor%20hired%2C%20no%20electrician">See all {n(hot.length)} <Arrow /></Link></div>
          <div className="joblist">{loading ? <p className="muted">Loading…</p> : top.map((j) => <JobRow key={j.id} j={j} />)}</div>
        </div>
      </section>

      <section className="sec-cream">
        <div className="wrap">
          <div className="sec-head"><div><span className="eyebrow">DIRECTORY</span><h2>Browse by state, county and city.</h2></div><Link className="btn btn-ghost" to="/directory">Open directory <Arrow /></Link></div>
          <div className="tiles">
            {states.map((s) => <Link key={s.name} className="tile" to={`/directory/${s.name}`}><h4>{STATES[s.name]}</h4><p>{s.count.toLocaleString()} jobs · {money(s.value)}</p><div className="tile-badges">{s.hot > 0 && <span className="badge hot"><Bolt /> {s.hot} no electrician</span>}</div><span className="tile-go">Open →</span></Link>)}
          </div>
          <p className="muted small">Top counties: {tally(jobs, (j) => `${j.county}, ${j.state}`).slice(0, 5).map((c, i) => <span key={c.name}>{i ? ' · ' : ''}<Link to={`/directory/${c.name.split(', ')[1]}/${slug(c.name.split(', ')[0])}`}>{c.name}</Link></span>)}</p>
        </div>
      </section>

      <section className="cta">
        <div className="wrap cta-in">
          <h2>Stop finding out when everyone else does.</h2>
          <p>Tell us your markets and trades — we’ll switch on your feed.</p>
          <div className="hero-ctas"><SalesButton className="btn btn-primary btn-lg" /><a className="btn btn-outline btn-lg" href={SALES.tel}>{SALES.display}</a></div>
        </div>
      </section>
    </>
  )
}
