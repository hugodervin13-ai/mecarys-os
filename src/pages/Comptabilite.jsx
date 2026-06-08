import { formatCurrency } from '../lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const mockData = [
  { month: 'Jan', revenus: 285000, depenses: 213000, profit: 72000 },
  { month: 'Fev', revenus: 310000, depenses: 229000, profit: 81000 },
  { month: 'Mar', revenus: 340000, depenses: 252000, profit: 88000 },
  { month: 'Avr', revenus: 365000, depenses: 273000, profit: 92000 },
  { month: 'Mai', revenus: 386730, depenses: 289300, profit: 97430 }
]

const mockExpenses = [
  { category: 'Cout produit', amount: 145000, percent: 50.1 },
  { category: 'Frais Amazon (FBA)', amount: 78000, percent: 27.0 },
  { category: 'PPC / Publicite', amount: 35000, percent: 12.1 },
  { category: 'Expedition', amount: 18000, percent: 6.2 },
  { category: 'Divers', amount: 13300, percent: 4.6 }
]

export default function Comptabilite() {
  const totalRevenus = 386730
  const totalDepenses = 289300
  const totalProfit = 97430

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#1a1a2e] mb-6">Comptabilite</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Revenus totaux (YTD)</p>
          <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{formatCurrency(totalRevenus)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Depenses totales (YTD)</p>
          <p className="text-2xl font-bold text-[#ef4444] mt-1">{formatCurrency(totalDepenses)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#e8e8e3]">
          <p className="text-[#6b7280] text-sm">Profit net (YTD)</p>
          <p className="text-2xl font-bold text-[#10b981] mt-1">{formatCurrency(totalProfit)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-[#e8e8e3]">
          <h3 className="text-[#1a1a2e] font-bold mb-4">Revenus vs Depenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e3" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e3', borderRadius: '8px', color: '#1a1a2e' }} />
              <Bar dataKey="revenus" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenus" />
              <Bar dataKey="depenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Depenses" />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#e8e8e3]">
          <h3 className="text-[#1a1a2e] font-bold mb-4">Repartition des depenses</h3>
          <div className="space-y-4">
            {mockExpenses.map((exp) => (
              <div key={exp.category}>
                <div className="flex justify-between mb-1">
                  <span className="text-[#6b7280] text-sm">{exp.category}</span>
                  <span className="text-[#1a1a2e] text-sm font-medium">{formatCurrency(exp.amount)} ({exp.percent}%)</span>
                </div>
                <div className="w-full bg-[#fafaf8] rounded-full h-2">
                  <div className="bg-[#6366f1] h-2 rounded-full" style={{ width: `${exp.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
