import type { Job, Sender } from '../types'
import { money } from './geo'

export interface Draft { to: string; subject: string; body: string; toName: string; phone: string; basis: 'contractor' | 'owner' }

const first = (n: string) => { const w = (n || '').trim().split(/\s+/)[0]; return w ? w.charAt(0) + w.slice(1).toLowerCase() : '' }

export function buildDraft(j: Job, s: Sender): Draft {
  const c = j.contractor
  const basis: Draft['basis'] = c ? 'contractor' : 'owner'
  const recipient = c ? (c.contact || c.name) : (j.applicant || j.owner || 'there')
  const greet = c?.contact ? `Hi ${first(c.contact)},` : `Hi ${c ? c.name : 'there'} team,`
  const where = `${j.address}, ${j.city}, ${j.state}`
  const scope = j.description ? j.description.replace(/\s+/g, ' ').slice(0, 220).replace(/[.,;:\s]+\S*$/, '') + '…' : `${j.kind.toLowerCase()} project`
  const val = j.valuation ? ` (listed at ${money(j.valuation)})` : ''
  const trade = s.trade || 'electrical'
  const ref = j.permitNo ? ` — ${j.stage === 'Land / Planning' ? 'project' : 'permit'} ${j.permitNo}` : ''
  let body: string
  if (c) {
    const elec = j.electrician === 'missing' ? `I noticed there isn't ${trade === 'electrical' ? 'an electrical contractor' : 'a ' + trade + ' contractor'} listed on the record yet, so I wanted to reach out before that scope gets filled.` : `I wanted to introduce ourselves in case you need another ${trade} option on this or future jobs.`
    body = `${greet}

I came across ${c.name} on the public permit record for ${where}${ref}${val}. The scope reads: "${scope}"

${elec}

${s.company} handles ${trade} work on projects like this — fast scheduling, clean documentation for inspections, and a crew that can mobilize within days of your start. I'd welcome the chance to send over a quote or answer any questions on the plans.

Do you have 10 minutes this week for a quick call?

Thanks,
${s.name}
${s.company}${s.phone ? '\n' + s.phone : ''}${s.email ? '\n' + s.email : ''}`
  } else {
    body = `Hi ${recipient === 'there' ? 'there' : first(recipient) || recipient},

I saw the public ${j.stage === 'Land / Planning' ? 'planning filing' : 'permit application'} for ${where}${ref}${val}: "${scope}"

${s.company} provides ${trade} and renovation services, and I'd like to be on your list as you line up contractors for this project. If you're still selecting a team, I'd be glad to share references and a preliminary quote.

Could we set up a short call?

Thanks,
${s.name}
${s.company}${s.phone ? '\n' + s.phone : ''}${s.email ? '\n' + s.email : ''}`
  }
  return {
    to: '', toName: c ? c.name : (j.applicant || j.owner || ''), phone: c?.phone || '', basis,
    subject: `${c ? 'Electrical' : 'Trade'} support for ${j.address} — ${s.company}`.replace('Electrical', trade === 'electrical' ? 'Electrical' : trade.charAt(0).toUpperCase() + trade.slice(1)),
    body,
  }
}

export const mailto = (d: { to: string; subject: string; body: string }) =>
  `mailto:${encodeURIComponent(d.to).replace(/%40/g, '@').replace(/%2C/g, ',')}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`
