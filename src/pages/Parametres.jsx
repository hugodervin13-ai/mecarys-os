import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { getSettings, updateSettings } from '../lib/supabase'

export default function Parametres() {
  const { user } = useStore()
  const [settings, setSettings] = useState({
    currency: 'EUR',
    language: 'fr',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) loadSettings()
  }, [user])

  const loadSettings = async () => {
    const { data } = await getSettings(user.id)
    if (data) {
      setSettings({
        currency: data.currency || 'EUR',
        language: data.language || 'fr',
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await updateSettings(user.id, settings)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#1a1a2e] mb-6">Parametres</h1>

      <div className="space-y-6 max-w-2xl">
        <div className="bg-white rounded-xl p-6 border border-[#e8e8e3]">
          <h3 className="text-[#1a1a2e] font-bold mb-4">Compte</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[#6b7280] text-sm mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#6b7280] text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#e8e8e3]">
          <h3 className="text-[#1a1a2e] font-bold mb-4">Preferences</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#6b7280] text-sm mb-1">Devise</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({...settings, currency: e.target.value})}
                  className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-[#6b7280] text-sm mb-1">Langue</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({...settings, language: e.target.value})}
                  className="w-full px-3 py-2 bg-[#fafaf8] border border-[#e8e8e3] rounded-lg text-[#1a1a2e] text-sm"
                >
                  <option value="fr">Francais</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder les parametres'}
          </button>
          {saved && (
            <span className="text-[#10b981] text-sm font-medium">✓ Parametres sauvegardes</span>
          )}
        </div>
      </div>
    </div>
  )
}
