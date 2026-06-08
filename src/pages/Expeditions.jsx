import { useState } from 'react'
import { getStatusColor } from '../lib/utils'

const mockShipments = [
  { id: 1, reference: 'EXP-2024-001', origin: 'Shenzhen', destination: 'Amazon FBA FR', status: 'transit', carrier: 'DHL', eta: '2024-05-20', items: 500 },
  { id: 2, reference: 'EXP-2024-002', origin: 'Guangzhou', destination: 'Amazon FBA DE', status: 'customs', carrier: 'FedEx', eta: '2024-05-18', items: 300 },
  { id: 3, reference: 'EXP-2024-003', origin: 'Istanbul', destination: 'Amazon FBA FR', status: 'delivered', carrier: 'TNT', eta: '2024-05-10', items: 200 }
]

const statusLabels = {
  production: 'Production',
  transit: 'En transit',
  customs: 'Douane',
  warehouse: 'Entrepot',
  delivered: 'Livre',
  fba: 'Amazon FBA'
}

export default function Expeditions() {
  const [shipments] = useState(mockShipments)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Expeditions</h1>
        <button className="bg-[#5a2d82] hover:bg-[#6b3d92] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          + Nouvelle expedition
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">En transit</p>
          <p className="text-2xl font-bold text-[#00d4ff] mt-1">{shipments.filter(s => s.status === 'transit').length}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">En douane</p>
          <p className="text-2xl font-bold text-[#f59e0b] mt-1">{shipments.filter(s => s.status === 'customs').length}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">Livrees</p>
          <p className="text-2xl font-bold text-[#10b981] mt-1">{shipments.filter(s => s.status === 'delivered').length}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3748]">
          <p className="text-[#a0aec0] text-sm">Unites en cours</p>
          <p className="text-2xl font-bold text-white mt-1">{shipments.reduce((a, s) => a + s.items, 0)}</p>
        </div>
      </div>

      <div className="bg-[#1a1f2e] rounded-xl border border-[#2d3748] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0f1419]">
            <tr>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Reference</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Origine</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Destination</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Transporteur</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Unites</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Statut</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">ETA</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.id} className="border-t border-[#2d3748] hover:bg-[#2d3748]/30">
                <td className="px-6 py-4 text-white text-sm font-mono">{s.reference}</td>
                <td className="px-6 py-4 text-[#a0aec0] text-sm">{s.origin}</td>
                <td className="px-6 py-4 text-white text-sm">{s.destination}</td>
                <td className="px-6 py-4 text-[#a0aec0] text-sm">{s.carrier}</td>
                <td className="px-6 py-4 text-white text-sm">{s.items}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(s.status)}`}>
                    {statusLabels[s.status] || s.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#a0aec0] text-sm">{s.eta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
