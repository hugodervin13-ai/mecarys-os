import { useEffect, useRef, useState } from 'react'
import { getFileUrl, kindOf, extOf, downloadFile, formatSize } from '../lib/fileStore'
import { formatDate } from '../lib/utils'

// Visionneuse plein écran : images (zoom + plein écran), PDF intégré,
// lecteur vidéo, et téléchargement pour les documents bureautiques.
export default function FilePreview({ node, onClose }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const stageRef = useRef(null)
  const kind = node ? kindOf(extOf(node.name)) : null

  useEffect(() => {
    if (!node) return
    let active = true
    let made = null
    setLoading(true)
    setZoom(1)
    getFileUrl(node.id).then((u) => {
      if (active) { setUrl(u); made = u; setLoading(false) }
      else if (u) URL.revokeObjectURL(u)
    })
    return () => { active = false; if (made) URL.revokeObjectURL(made) }
  }, [node])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!node) return null

  const fullscreen = () => { stageRef.current?.requestFullscreen?.() }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column',
        background: 'rgba(15,15,25,0.82)', backdropFilter: 'blur(4px)',
      }}
    >
      {/* Barre supérieure */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '14px 20px', color: '#fff', flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            {formatSize(node.size)} · {node.ext?.toUpperCase()} · {node.createdAt ? formatDate(node.createdAt) : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {kind === 'image' && (
            <>
              <PvBtn onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}>− Zoom</PvBtn>
              <PvBtn onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</PvBtn>
              <PvBtn onClick={() => setZoom((z) => Math.min(5, +(z + 0.25).toFixed(2)))}>+ Zoom</PvBtn>
              <PvBtn onClick={fullscreen}>⛶ Plein écran</PvBtn>
            </>
          )}
          {kind === 'video' && <PvBtn onClick={fullscreen}>⛶ Plein écran</PvBtn>}
          <PvBtn onClick={() => downloadFile(node.id, node.name)}>⬇ Télécharger</PvBtn>
          <PvBtn onClick={onClose} primary>✕ Fermer</PvBtn>
        </div>
      </div>

      {/* Scène */}
      <div
        ref={stageRef}
        onClick={(e) => e.stopPropagation()}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: 20, background: '#0f0f19' }}
      >
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Chargement…</div>
        ) : !url ? (
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
            Aperçu indisponible — fichier introuvable dans le stockage.
          </div>
        ) : kind === 'image' ? (
          <img
            src={url}
            alt={node.name}
            style={{ maxWidth: zoom === 1 ? '100%' : 'none', maxHeight: zoom === 1 ? '100%' : 'none', transform: `scale(${zoom})`, transition: 'transform 0.12s', objectFit: 'contain', borderRadius: 8 }}
          />
        ) : kind === 'pdf' ? (
          <iframe title={node.name} src={url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff' }} />
        ) : kind === 'video' ? (
          <video src={url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>📄</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{node.name}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>
              Ce type de document ne peut pas être prévisualisé dans le navigateur.
            </div>
            <button
              onClick={() => downloadFile(node.id, node.name)}
              style={{ padding: '12px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              ⬇ Télécharger le fichier
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PvBtn({ children, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.2)',
        background: primary ? '#6366f1' : 'rgba(255,255,255,0.1)', color: '#fff',
      }}
      onMouseEnter={(e) => { if (!primary) e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
      onMouseLeave={(e) => { if (!primary) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
    >
      {children}
    </button>
  )
}
