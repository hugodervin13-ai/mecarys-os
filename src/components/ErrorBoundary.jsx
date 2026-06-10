import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e8e8e3', borderRadius: 14, padding: '40px 32px', textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>😵</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>Une erreur est survenue</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
              Cette page a rencontré un problème inattendu. Rechargez la page ou revenez au tableau de bord.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => window.location.reload()}
                style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Recharger
              </button>
              <button onClick={() => { window.location.href = '/' }}
                style={{ padding: '10px 20px', background: '#fff', color: '#6366f1', border: '1px solid #6366f1', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Tableau de bord
              </button>
            </div>
            {import.meta.env.DEV && (
              <pre style={{ marginTop: 20, fontSize: 11, color: '#ef4444', textAlign: 'left', overflow: 'auto', maxHeight: 120, background: '#fef2f2', padding: 10, borderRadius: 8 }}>
                {String(this.state.error?.stack || this.state.error)}
              </pre>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
