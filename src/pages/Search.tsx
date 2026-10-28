import { useData } from '../lib/data'
import { Opportunities } from '../components/Opportunities'

export function SearchPage() {
  const { jobs, loading, error } = useData()
  return (
    <div className="wrap page">
      <h1>Opportunities</h1>
      <p className="lede">Describe what you’re looking for. Rules are parsed in your browser — nothing leaves your device.</p>
      {loading ? <p className="muted">Loading records…</p> : error ? <p>Couldn’t load data: {error}</p> : <Opportunities jobs={jobs} scope="all covered areas" withSearchParam />}
    </div>
  )
}
