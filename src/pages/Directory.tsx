import { Link, useParams } from 'react-router-dom'
import { useData, slug, tally } from '../lib/data'
import { STATES, money } from '../lib/geo'
import { Opportunities } from '../components/Opportunities'
import { Bolt } from '../components/Icons'

const Crumbs = ({ items }: { items: [string, string?][] }) => (
  <nav className="crumbs" aria-label="Breadcrumb">{items.map(([t, to], i) => <span key={t}>{to ? <Link to={to}>{t}</Link> : <b>{t}</b>}{i < items.length - 1 && ' › '}</span>)}</nav>
)
function Tiles({ nodes, base, unit }: { nodes: { name: string; count: number; hot: number; early: number; value: number }[]; base: string; unit: string }) {
  return (
    <div className="tiles">
      {nodes.map((n) => (
        <Link key={n.name} to={`${base}/${slug(n.name)}`} className="tile">
          <h4>{n.name}</h4>
          <p>{n.count.toLocaleString()} jobs · {money(n.value)}</p>
          <div className="tile-badges">{n.hot > 0 && <span className="badge hot"><Bolt /> {n.hot} no electrician</span>}{n.early > 0 && <span className="badge land">{n.early} land / planning</span>}</div>
          <span className="tile-go">View {unit} →</span>
        </Link>
      ))}
    </div>
  )
}

export function DirectoryPage() {
  const { state, county, city } = useParams()
  const { jobs, loading, error } = useData()
  const st = state?.toUpperCase()
  if (loading) return <div className="wrap page"><p className="muted">Loading records…</p></div>
  if (error) return <div className="wrap page"><p>Couldn’t load data: {error}</p></div>

  // Level 0: all states
  if (!st) {
    const byState = new Map(tally(jobs, (j) => j.state).map((n) => [n.name, n]))
    return (
      <div className="wrap page">
        <Crumbs items={[['Directory']]} />
        <h1>Directory</h1>
        <p className="lede">Browse upcoming construction by state, county and city. States with live data are highlighted; the rest are on the roadmap.</p>
        <div className="statemap">
          {Object.entries(STATES).map(([ab, name]) => {
            const n = byState.get(ab)
            return n ? (
              <Link key={ab} to={`/directory/${ab}`} className="st live"><b>{ab}</b><span>{name}</span><em>{n.count.toLocaleString()} jobs{n.hot ? ` · ${n.hot} hot` : ''}</em></Link>
            ) : (
              <div key={ab} className="st soon"><b>{ab}</b><span>{name}</span><em>Coming soon</em></div>
            )
          })}
        </div>
      </div>
    )
  }
  const stJobs = jobs.filter((j) => j.state === st)
  if (!STATES[st]) return <div className="wrap page"><h1>State not found</h1><Link to="/directory">Back to directory</Link></div>
  if (!county) {
    return (
      <div className="wrap page">
        <Crumbs items={[['Directory', '/directory'], [STATES[st]]]} />
        <h1>{STATES[st]}</h1>
        {stJobs.length === 0 ? <p className="lede">No live data for {STATES[st]} yet — we’re adding counties continuously. <Link to="/coverage">See current coverage</Link>.</p> : (
          <>
            <p className="lede">{stJobs.length.toLocaleString()} upcoming jobs across {new Set(stJobs.map((j) => j.county)).size} counties.</p>
            <h3 className="sec">Counties</h3>
            <Tiles nodes={tally(stJobs, (j) => j.county)} base={`/directory/${st}`} unit="county" />
            <h3 className="sec">All {STATES[st]} opportunities</h3>
            <Opportunities key={st + (county||'') + (city||'')} jobs={stJobs} scope={STATES[st]} />
          </>
        )}
      </div>
    )
  }
  const cj = stJobs.filter((j) => j.county === county)
  if (!city) {
    return (
      <div className="wrap page">
        <Crumbs items={[['Directory', '/directory'], [STATES[st], `/directory/${st}`], [county]]} />
        <h1>{county}, {st}</h1>
        <p className="lede">{cj.length.toLocaleString()} upcoming jobs.</p>
        <h3 className="sec">Cities</h3>
        <Tiles nodes={tally(cj, (j) => j.city)} base={`/directory/${st}/${slug(county)}`} unit="city" />
        <h3 className="sec">All {county} opportunities</h3>
        <Opportunities key={st + (county||'') + (city||'')} jobs={cj} scope={county} />
      </div>
    )
  }
  const tj = cj.filter((j) => j.city === city)
  return (
    <div className="wrap page">
      <Crumbs items={[['Directory', '/directory'], [STATES[st], `/directory/${st}`], [county, `/directory/${st}/${slug(county)}`], [city]]} />
      <h1>{city}, {st}</h1>
      <p className="lede">{tj.length.toLocaleString()} upcoming jobs · {tj.filter((j) => j.hot).length} with a contractor hired and no electrician on file.</p>
      <Opportunities key={st + (county||'') + (city||'')} jobs={tj} scope={city} />
    </div>
  )
}
