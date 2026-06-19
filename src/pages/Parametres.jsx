import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { useData, mutate } from '../lib/useData'
import { box, inp, lbl, colors } from '../lib/theme'
import { getSettings, updateSettings } from '../lib/supabase'

const CURRENCIES = [
  { value: 'EUR', label: 'EUR — Euro (€)', symbol: '€' },
  { value: 'USD', label: 'USD — Dollar ($)', symbol: '$' },
  { value: 'GBP', label: 'GBP — Livre sterling (£)', symbol: '£' },
]

const MARKETPLACES = [
  { value: 'fr', flag: '🇫🇷', label: 'Amazon.fr — France' },
  { value: 'de', flag: '🇩🇪', label: 'Amazon.de — Allemagne' },
  { value: 'it', flag: '🇮🇹', label: 'Amazon.it — Italie' },
  { value: 'es', flag: '🇪🇸', label: 'Amazon.es — Espagne' },
  { value: 'uk', flag: '🇬🇧', label: 'Amazon.co.uk — Royaume-Uni' },
  { value: 'us', flag: '🇺🇸', label: 'Amazon.com — États-Unis' },
]

export default function Parametres() {
  const { user } = useStore()
  // PGRST116 = aucune ligne trouvée (nouvel utilisateur) : pas une vraie erreur
  const { data: savedSettings } = useData('settings', async () => {
    const res = await getSettings(user.id)
    if (res.error?.code === 'PGRST116') return { data: {}, error: null }
    return res
  }, [user])
  const [settings, setSettings] = useState({ currency: 'EUR', language: 'fr', marketplace: 'fr', seller_id: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (savedSettings) setSettings({
      currency: savedSettings.currency || 'EUR',
      language: savedSettings.language || 'fr',
      marketplace: savedSettings.marketplace || 'fr',
      seller_id: savedSettings.seller_id || '',
    })
  }, [savedSettings])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    const ok = await mutate(() => updateSettings(user.id, settings), 'settings', 'Paramètres sauvegardés')
    setSaving(false)
    if (ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Paramètres</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>Configurez votre compte et vos préférences d'affichage</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680 }}>
        <div style={{ ...box, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #f0f0eb' }}>
            👤 Compte
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={lbl}>Email</label>
              <input style={{ ...inp, color: '#9ca3af', cursor: 'not-allowed' }} type="email" value={user?.email || ''} disabled />
            </div>
            <div>
              <label style={lbl}>Identifiant vendeur</label>
              <input style={inp} type="text" placeholder="Ex: AXXXXXXXXXXX" value={settings.seller_id} onChange={e => setSettings({ ...settings, seller_id: e.target.value })} />
            </div>
          </div>
        </div>

        <div style={{ ...box, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #f0f0eb' }}>
            🌍 Marketplace principale
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {MARKETPLACES.map(m => (
              <button key={m.value} type="button" onClick={() => setSettings({ ...settings, marketplace: m.value })}
                style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${settings.marketplace === m.value ? '#6366f1' : '#e8e8e3'}`, background: settings.marketplace === m.value ? '#6366f115' : '#fafaf8', color: settings.marketplace === m.value ? '#6366f1' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{m.flag}</span>
                <span>{m.label.split(' — ')[1]}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...box, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #f0f0eb' }}>
            ⚙️ Préférences
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={lbl}>Devise d'affichage</label>
              <select style={inp} value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Langue</label>
              <select style={inp} value={settings.language} onChange={e => setSettings({ ...settings, language: e.target.value })}>
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ ...box, padding: 24, background: '#fafaf8' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>🔑 Clé API Amazon (Optionnel)</h3>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>Pour synchroniser automatiquement vos ventes et stocks depuis Amazon Seller Central</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={lbl}>Access Key ID</label>
              <input style={inp} type="password" placeholder="••••••••••••••••" />
            </div>
            <div>
              <label style={lbl}>Secret Access Key</label>
              <input style={inp} type="password" placeholder="••••••••••••••••" />
            </div>
          </div>
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#92400e' }}>⚠️ Fonctionnalité en cours de développement — sera disponible prochainement</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '12px 32px', background: saving ? '#9ca3af' : colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
          </button>
          {saved && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
              ✓ Paramètres sauvegardés
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
