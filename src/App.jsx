import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './lib/hooks'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import VentesProfit from './pages/VentesProfit'
import Produits from './pages/Produits'
import Concurrents from './pages/Concurrents'
import AnalyseIA from './pages/AnalyseIA'
import Fournisseurs from './pages/Fournisseurs'
import Commandes from './pages/Commandes'
import Expeditions from './pages/Expeditions'
import Stock from './pages/Stock'
import QualiteSAV from './pages/QualiteSAV'
import Documents from './pages/Documents'
import Comptabilite from './pages/Comptabilite'
import Parametres from './pages/Parametres'
import NotFound from './pages/NotFound'
import Loading from './components/Loading'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/ventes-profit" element={<VentesProfit />} />
          <Route path="/produits" element={<Produits />} />
          <Route path="/concurrents" element={<Concurrents />} />
          <Route path="/analyse-ia" element={<AnalyseIA />} />
          <Route path="/fournisseurs" element={<Fournisseurs />} />
          <Route path="/commandes" element={<Commandes />} />
          <Route path="/expeditions" element={<Expeditions />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/qualite-sav" element={<QualiteSAV />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/comptabilite" element={<Comptabilite />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
