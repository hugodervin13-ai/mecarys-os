import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useStore } from '../lib/store'

export default function Layout() {
  const { sidebarOpen } = useStore()
  const ml = sidebarOpen ? 240 : 68

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f0' }}>
      <Sidebar />
      <div style={{ marginLeft: ml, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
        <Header />
        <main style={{ flex: 1, padding: 24, overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
