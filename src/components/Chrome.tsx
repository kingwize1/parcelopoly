import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { APP_NAME, APP_TAGLINE, SALES } from '../config'
import { Phone, Arrow } from './Icons'

export const Logo = ({ light }: { light?: boolean }) => (
  <Link to="/" className={`logo ${light ? 'light' : ''}`} aria-label={`${APP_NAME} home`}>
    <span className="logo-mark" aria-hidden><svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="7" fill="#027a3b" /><path d="M9 24V8h7.2a5.2 5.2 0 0 1 0 10.4H13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><rect x="19.5" y="19.5" width="4" height="4" rx=".8" fill="#9be3b9" /></svg></span>
    <span className="logo-text"><b>{APP_NAME}</b><small>{APP_TAGLINE}</small></span>
  </Link>
)

/** Every "Talk to Sales" button in the app is this component → href comes from SALES.tel in src/config.ts */
export function SalesButton({ className = 'btn btn-primary', label = 'Talk to Sales' }: { className?: string; label?: string }) {
  return <a className={className} href={SALES.tel}>{label} <Arrow /></a>
}

export function Nav() {
  const [open, setOpen] = useState(false)
  const links = [['/search', 'Opportunities'], ['/directory', 'Directory'], ['/coverage', 'Coverage & Data']]
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Logo light />
        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {links.map(([to, t]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}>{t}</NavLink>)}
        </nav>
        <div className="nav-cta">
          <a className="nav-phone" href={SALES.tel}><Phone /> {SALES.display}</a>
          <SalesButton />
          <button className="burger" aria-label="Menu" onClick={() => setOpen(!open)}><span /><span /><span /></button>
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap foot-in">
        <div><Logo light /><p className="muted-l">Pre-construction intelligence from public permit, filing and planning records. Built by Grand Scale Renovations.</p></div>
        <div><h4>Product</h4><Link to="/search">Opportunities</Link><Link to="/directory">Directory</Link><Link to="/coverage">Coverage &amp; Data</Link></div>
        <div><h4>Contact</h4><a href={SALES.tel}>{SALES.display}</a><a href={SALES.site} target="_blank" rel="noreferrer">grandscalerenovations.com</a></div>
      </div>
      <div className="wrap foot-legal">© {new Date().getFullYear()} Parcelopoly · powered by Grand Scale Renovations. Data comes from public government open-data portals and is provided as-is; verify against the source record before relying on it.</div>
    </footer>
  )
}

