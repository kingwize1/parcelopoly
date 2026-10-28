import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { DEFAULT_SENDER } from '../config'
import type { Job, Sender } from '../types'

interface Ctx { draftFor: Job | null; openDraft: (j: Job) => void; closeDraft: () => void; detail: Job | null; openDetail: (j: Job | null) => void; sender: Sender; setSender: (s: Sender) => void }
const C = createContext<Ctx>(null as unknown as Ctx)
export const useUI = () => useContext(C)

export function UIProvider({ children }: { children: ReactNode }) {
  const [draftFor, setDraft] = useState<Job | null>(null)
  const [detail, openDetail] = useState<Job | null>(null)
  const [sender, setS] = useState<Sender>(() => {
    try { return { ...DEFAULT_SENDER, ...JSON.parse(localStorage.getItem('parcelopoly.sender') || '{}') } } catch { return DEFAULT_SENDER }
  })
  useEffect(() => { document.body.style.overflow = draftFor || detail ? 'hidden' : '' }, [draftFor, detail])
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDraft(null); openDetail(null) } }; window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f) }, [])
  const setSender = (s: Sender) => { setS(s); try { localStorage.setItem('parcelopoly.sender', JSON.stringify(s)) } catch { /* ignore */ } }
  return <C.Provider value={{ draftFor, openDraft: setDraft, closeDraft: () => setDraft(null), detail, openDetail, sender, setSender }}>{children}</C.Provider>
}
