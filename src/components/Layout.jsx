import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  return (
    <div className="flex bg-bg text-white min-h-screen">
      <Sidebar />
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 px-6 py-5 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
