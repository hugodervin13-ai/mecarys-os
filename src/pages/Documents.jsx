import { useState } from 'react'

const mockDocuments = [
  { id: 1, name: 'Facture fournisseur #2024-042', type: 'facture', date: '2024-05-10', size: '245 KB' },
  { id: 2, name: 'Certificat CE - Kit Phare LED', type: 'certificat', date: '2024-04-28', size: '1.2 MB' },
  { id: 3, name: 'Bon de commande #BC-2024-018', type: 'commande', date: '2024-04-15', size: '180 KB' },
  { id: 4, name: 'Rapport qualite Q1 2024', type: 'rapport', date: '2024-04-01', size: '3.5 MB' },
  { id: 5, name: 'Contrat fournisseur Shenzhen', type: 'contrat', date: '2024-03-15', size: '520 KB' }
]

const typeIcons = {
  facture: '🧾',
  certificat: '📜',
  commande: '📋',
  rapport: '📊',
  contrat: '📝'
}

export default function Documents() {
  const [documents] = useState(mockDocuments)
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? documents : documents.filter(d => d.type === filter)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Documents</h1>
        <button className="bg-[#5a2d82] hover:bg-[#6b3d92] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          + Importer un document
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        {['all', 'facture', 'certificat', 'commande', 'rapport', 'contrat'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === type ? 'bg-[#5a2d82] text-white' : 'bg-[#1a1f2e] text-[#a0aec0] hover:text-white border border-[#2d3748]'}`}
          >
            {type === 'all' ? 'Tous' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
          </button>
        ))}
      </div>

      <div className="bg-[#1a1f2e] rounded-xl border border-[#2d3748] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0f1419]">
            <tr>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Document</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Type</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Date</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Taille</th>
              <th className="px-6 py-3 text-left text-[#a0aec0] text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => (
              <tr key={doc.id} className="border-t border-[#2d3748] hover:bg-[#2d3748]/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{typeIcons[doc.type] || '📄'}</span>
                    <span className="text-white text-sm">{doc.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-[#5a2d82]/20 text-[#5a2d82] px-2 py-1 rounded-full text-xs capitalize">
                    {doc.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#a0aec0] text-sm">{doc.date}</td>
                <td className="px-6 py-4 text-[#a0aec0] text-sm">{doc.size}</td>
                <td className="px-6 py-4">
                  <button className="text-[#00d4ff] hover:text-[#00b4d8] text-sm mr-4">Voir</button>
                  <button className="text-[#ef4444] hover:text-red-300 text-sm">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
