import { useState } from 'react'
import { useStore } from '../lib/store'

export default function Parametres() {
  const { user } = useStore()
  const [settings, setSettings] = useState({
    currency: 'EUR',
    language: 'fr',
    theme: 'dark',
    notifications: true,
    emailAlerts: true,
    stockAlertThreshold: 20
  })

  const handleSave = () => {
    alert('Parametres sauvegardes !')
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Parametres</h1>

      <div className="space-y-6 max-w-2xl">
        <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2d3748]">
          <h3 className="text-white font-bold mb-4">Compte</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[#a0aec0] text-sm mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-[#a0aec0] text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2d3748]">
          <h3 className="text-white font-bold mb-4">Preferences</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#a0aec0] text-sm mb-1">Devise</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({...settings, currency: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-white text-sm"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-[#a0aec0] text-sm mb-1">Langue</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({...settings, language: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-white text-sm"
                >
                  <option value="fr">Francais</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[#a0aec0] text-sm mb-1">Seuil alerte stock</label>
              <input
                type="number"
                value={settings.stockAlertThreshold}
                onChange={(e) => setSettings({...settings, stockAlertThreshold: Number(e.target.value)})}
                className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3748] rounded-lg text-white text-sm focus:border-[#5a2d82] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2d3748]">
          <h3 className="text-white font-bold mb-4">Notifications</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[#a0aec0] text-sm">Notifications push</span>
              <div
                onClick={() => setSettings({...settings, notifications: !settings.notifications})}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${settings.notifications ? 'bg-[#5a2d82]' : 'bg-[#2d3748]'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform mt-0.5 ${settings.notifications ? 'translate-x-5.5' : 'translate-x-0.5'}`}></div>
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[#a0aec0] text-sm">Alertes par email</span>
              <div
                onClick={() => setSettings({...settings, emailAlerts: !settings.emailAlerts})}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${settings.emailAlerts ? 'bg-[#5a2d82]' : 'bg-[#2d3748]'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform mt-0.5 ${settings.emailAlerts ? 'translate-x-5.5' : 'translate-x-0.5'}`}></div>
              </div>
            </label>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="bg-[#5a2d82] hover:bg-[#6b3d92] text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          Sauvegarder les parametres
        </button>
      </div>
    </div>
  )
}
