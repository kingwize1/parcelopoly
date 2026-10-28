export type ElecStatus = 'on_file' | 'missing' | 'unknown'
export interface Contractor { name: string; role?: string; contact?: string; phone?: string | null; city?: string | null; state?: string | null }
export interface Job {
  id: string; source: string; state: string; county: string; city: string; address: string
  kind: string; category?: string; stage: 'Land / Planning' | 'Filed / Plan Review' | 'Permit Issued'; status?: string; description?: string
  valuation: number | null; units: number | null; sqft: number | null; lat: number | null; lon: number | null
  issuedDate: string | null; filedDate: string | null; permitNo?: string; link?: string
  contractor: Contractor | null; electrician: ElecStatus; owner: string | null; applicant: string | null; trades?: string[]
  // derived client-side
  hot?: boolean; window?: string; score?: number; daysSince?: number | null
}
export interface Meta { generatedAt: string; total: number; sources: { key: string; name: string; url: string; coverage: string; ok: boolean; count: number; error?: string; note?: string }[] }
export interface Sender { name: string; company: string; trade: string; phone: string; email: string }
