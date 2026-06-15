import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './lib/hooks'
import Login from './pages/Login'
import Layout from './components/Layout'
import Loading from './components/Loading'
import ErrorBoundary from './components/ErrorBoundary'

// Code splitting : chaque page est chargée à la demande,
// le bundle initial ne contient que le shell de l'app.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const VentesProfit = lazy(() => import('./pages/VentesProfit'))
const Produits = lazy(() => import('./pages/Produits'))
const Concurrents = lazy(() => import('./pages/Concurrents'))
const AnalyseIA = lazy(() => import('./pages/AnalyseIA'))
const Fournisseurs = lazy(() => import('./pages/Fournisseurs'))
const Commandes = lazy(() => import('./pages/Commandes'))
const Expeditions = lazy(() => import('./pages/Expeditions'))
const Stock = lazy(() => import('./pages/Stock'))
const Documents = lazy(() => import('./pages/Documents'))
const Parametres = lazy(() => import('./pages/Parametres'))
const NotFound = lazy(() => import('./pages/NotFound'))

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loading />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {[
            ['/', Dashboard],
            ['/ventes-profit', VentesProfit],
            ['/produits', Produits],
            ['/concurrents', Concurrents],
            ['/analyse-ia', AnalyseIA],
            ['/fournisseurs', Fournisseurs],
            ['/commandes', Commandes],
            ['/expeditions', Expeditions],
            ['/stock', Stock],
            ['/documents', Documents],
            ['/parametres', Parametres],
            ['*', NotFound],
          ].map(([path, Page]) => (
            <Route key={path} path={path} element={
              <ErrorBoundary>
                <Suspense fallback={<Loading />}>
                  <Page />
                </Suspense>
              </ErrorBoundary>
            } />
          ))}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
