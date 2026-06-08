import { useState } from 'react'
import Modal from '../components/Modal'

const mockSuppliers = [
  { id: 1, name: 'Shenzhen Electronics Co.', country: 'Chine', contact: 'contact@shenzhen-elec.com', products: 3, status: 'active', lastOrder: '2024-04-15' },
  { id: 2, name: 'Guangzhou Trading Ltd.', country: 'Chine', contact: 'sales@gz-trading.com', products: 2, status: 'active', lastOrder: '2024-03-20' },
  { id: 3, name: 'Istanbul Packaging', country: 'Turquie', contact: 'info@ist-pack.com', products: 1, status: 'inactive', lastOrder: '2024-01-10' }
]

export default function Fournisseurs() {
  const [suppliers] = useState(mockSuppliers)
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a2e]">Fournisseurs</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          + Ajouter un fournisseur
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Total fournisseurs</p>
          <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{suppliers.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Actifs</p>
          <p className="text-2xl font-bold text-[#10b981] mt-1">{suppliers.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Pays</p>
          <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{new Set(suppliers.map(s => s.country)).size}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8e3] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#fafaf8]">
            <tr>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Nom</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Pays</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Contact</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Produits</th>
              <th className="px-6 py-3 text-left text-[#6b7280] text-sm font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t border-[#e8e8e3] hover:bg-[#f5f5f0]">
                <td className="px-6 py-4 text-[#1a1a2e] text-sm font-medium">{s.name}</td>
                <td className="px-6 py-4 text-[#6b7280] text-sm">{s.country}</td>
                <td className="px-6 py-4 text-[#3b82f6] text-sm">{s.contact}</td>
                <td className="px-6 py-4 text-[#1a1a2e] text-sm">{s.products}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${s.status === 'active' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#9ca3af]/10 text-[#6b7280]'}`}>
                    {s.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouveau fournisseur">
        <form className="space-y-4">
          <div>
            <label className="block text-[#6b7280] text-sm mb-1">Nom</label>
            <input type="text" className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Pays</label>
              <input type="text" className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Contact email</label>
              <input type="email" className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm focus:border-[#6366f1] focus:outline-none" />
            </div>
          </div>
          <button type="submit" className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white py-3 rounded-lg font-semibold transition-colors">
            Ajouter
          </button>
        </form>
      </Modal>
    </div>
  )
}
