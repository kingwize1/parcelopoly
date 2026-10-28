import { useEffect, useState } from 'react'
import { useUI } from '../lib/ui'
import { buildDraft, mailto } from '../lib/email'
import { Mail, X, Copy, Check, Phone } from './Icons'
import type { Sender } from '../types'

export function EmailComposer() {
  const { draftFor: j, closeDraft, sender, setSender } = useUI()
  const [d, setD] = useState({ to: '', subject: '', body: '' })
  const [meta, setMeta] = useState({ toName: '', phone: '', basis: 'contractor' as 'contractor' | 'owner' })
  const [copied, setCopied] = useState(false)
  const [showSender, setShowSender] = useState(false)
  useEffect(() => {
    if (!j) return
    const x = buildDraft(j, sender)
    setD({ to: x.to, subject: x.subject, body: x.body }); setMeta({ toName: x.toName, phone: x.phone, basis: x.basis }); setCopied(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [j])
  if (!j) return null
  const regen = (s: Sender) => { setSender(s); const x = buildDraft(j, s); setD((p) => ({ ...p, subject: x.subject, body: x.body })) }
  const copy = async () => {
    const text = `To: ${d.to}\nSubject: ${d.subject}\n\n${d.body}`
    try { await navigator.clipboard.writeText(text) } catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove() }
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div className="overlay" onClick={closeDraft}>
      <div className="modal composer" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <div className="composer-head"><h3><Mail /> New message</h3><button className="icon-btn" onClick={closeDraft} aria-label="Close"><X /></button></div>
        <div className="composer-ctx">Intro to <b>{meta.toName || 'project contact'}</b> for <b>{j.address}</b>{meta.phone && <> · <a href={`tel:${meta.phone}`}><Phone /> {meta.phone}</a></>}</div>
        <label className="field"><span>To</span><input type="email" value={d.to} placeholder={`Add ${meta.toName || 'recipient'}’s email — public permit records don’t include emails`} onChange={(e) => setD({ ...d, to: e.target.value })} /></label>
        <label className="field"><span>Subject</span><input value={d.subject} onChange={(e) => setD({ ...d, subject: e.target.value })} /></label>
        <textarea className="body" value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} rows={14} />
        <button className="link-btn" onClick={() => setShowSender(!showSender)}>{showSender ? 'Hide' : 'Edit'} sender signature</button>
        {showSender && (
          <div className="sender-grid">
            {(['name', 'company', 'trade', 'phone', 'email'] as const).map((k) => (
              <label key={k} className="field"><span>{k}</span><input value={sender[k]} onChange={(e) => regen({ ...sender, [k]: e.target.value })} /></label>
            ))}
          </div>
        )}
        <div className="composer-actions">
          <button className="btn btn-ghost" onClick={copy}>{copied ? <><Check /> Copied</> : <><Copy /> Copy</>}</button>
          <a className="btn btn-primary" href={mailto(d)}><Mail /> Open in email app</a>
        </div>
      </div>
    </div>
  )
}
