import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Footer, Nav } from './components/Chrome'
import { DetailDrawer } from './components/Jobs'
import { EmailComposer } from './components/EmailComposer'
import { UIProvider } from './lib/ui'
import { Home } from './pages/Home'
import { SearchPage } from './pages/Search'
import { DirectoryPage } from './pages/Directory'
import { CoveragePage } from './pages/Coverage'

function ScrollTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0) }, [pathname]); return null }

export default function App() {
  return (
    <HashRouter>
      <UIProvider>
        <ScrollTop />
        <Nav />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/directory" element={<DirectoryPage />} />
            <Route path="/directory/:state" element={<DirectoryPage />} />
            <Route path="/directory/:state/:county" element={<DirectoryPage />} />
            <Route path="/directory/:state/:county/:city" element={<DirectoryPage />} />
            <Route path="/coverage" element={<CoveragePage />} />
            <Route path="*" element={<div className="wrap page"><h1>Page not found</h1></div>} />
          </Routes>
        </main>
        <Footer />
        <DetailDrawer />
        <EmailComposer />
      </UIProvider>
    </HashRouter>
  )
}
