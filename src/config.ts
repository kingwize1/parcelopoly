// ──────────────────────────────────────────────────────────────
//  Parcelopoly — site configuration
// ──────────────────────────────────────────────────────────────
export const APP_NAME = 'Parcelopoly'
export const APP_TAGLINE = 'powered by Grand Scale Renovations'

/**
 * TALK TO SALES destination — change it here and every "Talk to Sales" button updates.
 * Currently: call Grand Scale Renovations' AI customer-service line (grandscalerenovations.com).
 */
export const SALES = {
  tel: 'tel:+14702968436',
  display: '+1 (470) 296-8436',
  site: 'https://grandscalerenovations.com',
}

/** Default sender signature for intro emails (users can edit it in the composer; saved in their browser). */
export const DEFAULT_SENDER = {
  name: 'King Wize',
  company: 'Grand Scale Renovations',
  trade: 'electrical',
  phone: SALES.display,
  email: '',
}

export const DATA_BASE = `${import.meta.env.BASE_URL}data/`
