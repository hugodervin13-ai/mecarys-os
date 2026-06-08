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
        <h1 className="text-3xl font-bold text-white">Fournisseurs</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#5a2d82] hover:bg-[#6b3d92] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          + Ajouter un fournisseur
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">Total fournisseurs</p>
          <p className="text-2xl font-bold text-white mt-1">{suppliers.length}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">Actifs</p>
          <p className="text-2xl font-bold text-[#10b981] mt-1">{suppliers.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">Pays</p>
          <p className="text-2xl font-bold text-white mt-1">{new Set(suppliers.map(s => s.country)).size}</p>
        </div>
      </div>

      <div className="bg-[#1a1f2e] rounded-xl border border-[#2d3748] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0f1419]">
            <tr>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Nom</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Pays</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Contact</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Produits</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t border-[#2d3748] hover:bg-[#2d3748]/30">
                <td className="px-6 py-4 text-white text-sm font-medium">{s.name}</td>
                <td className="px-6 py-4 text-[#a0aec0] text-sm">{s.country}</td>
                <td className="px-6 py-4 text-[#00d4ff] text-sm">{s.contact}</td>
                <td className="px-6 py-4 text-white text-sm">{s.products}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${s.status === 'active' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#a0aec0]/20 text-[#a0aec0]'}`}>
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
            <label className="block text-[#a0aec0] text-sm mb-1">Nom</label>
            <input type="text" className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-white text-sm focus:border-[#5a2d82] focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#a0aec0] text-sm mb-1">Pays</label>
              <input type="text" className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-white text-sm focus:border-[#5a2d82] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[#a0aec0] text-sm mb-1">Contact email</label>
              <input type="email" className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-white text-sm focus:border-[#5a2d82] focus:outline-none" />
            </div>
          </div>
          <button type="submit" className="w-full bg-[#5a2d82] hover:bg-[#6b3d92] text-white py-3 rounded-lg font-semibold transition-colors">
            Ajouter
          </button>
        </form>
      </Modal>
    </div>
  )
}
