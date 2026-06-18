# MECARYS OS — Guide projet pour AI

## Vue d'ensemble

**MECARYS OS** est un tableau de bord SaaS pour vendeurs Amazon FBA.  
Interface premium de gestion : produits, stocks, expéditions, documents, fournisseurs, commandes, ventes/profits, analyse IA concurrentielle.

- **URL production** : https://mecarys-os.vercel.app
- **GitHub** : https://github.com/hugodervin13-ai/mecarys-os
- **Branche principale** : `main` (= production sur Vercel via auto-deploy)
- **Branche de travail** : `merge-dashboard-fixes` (toujours pousser sur `HEAD:main`)

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| UI | React 19 + JSX |
| Build | Vite 6 |
| CSS | Tailwind 4 (inline styles en priorité, pas de classes utilitaires) |
| État global | Zustand (`src/lib/store.js`) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Stockage fichiers local | IndexedDB via `src/lib/idb.js` |
| Charts | Recharts (`AreaChart`, `Area`, `XAxis`, `Tooltip`, `ResponsiveContainer`) |
| Routing | React Router v7 |
| Déploiement | Vercel (auto-deploy sur push `main`) |

**Important :** les styles sont en `style={{ }}` inline, pas des classes Tailwind. Tailwind 4 est présent mais utilisé uniquement pour les resets/base.

---

## Variables d'environnement

À créer dans `.env.local` (et dans Vercel → Settings → Environment Variables) :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Architecture `src/`

```
src/
├── main.jsx              # Point d'entrée React
├── App.jsx               # Router principal + AuthGuard
├── index.css             # Reset global minimal
│
├── components/
│   ├── Layout.jsx        # Shell : Sidebar + Header + <Outlet/>
│   ├── Sidebar.jsx       # Navigation latérale avec icônes
│   ├── Header.jsx        # Barre du haut (période, notifs, déconnexion)
│   ├── Modal.jsx         # Modale générique réutilisable
│   ├── ContextMenu.jsx   # Menu contextuel flottant (clic droit)
│   ├── ErrorBoundary.jsx # Catch React errors (affiche stack en DEV seulement)
│   ├── FilePreview.jsx   # Aperçu fichier : image/zoom, PDF/iframe, vidéo
│   ├── KPICard.jsx       # Carte KPI réutilisable (valeur + tendance)
│   ├── Loading.jsx       # Spinner de chargement
│   └── ui.jsx            # Micro-composants UI (Badge, Tag, etc.)
│
├── lib/
│   ├── store.js          # Zustand global : { user, toast, addToast, cache, setCache }
│   ├── supabase.js       # Client Supabase + helpers CRUD basiques
│   ├── useData.js        # Hook SWR maison : stale-while-revalidate, TTL 1 min
│   ├── theme.js          # Tokens design partagés : colors, box, inp, lbl
│   ├── utils.js          # formatDate, formatCurrency, etc.
│   ├── hooks.js          # Hooks React utilitaires
│   ├── idb.js            # Wrapper IndexedDB (stores: nodes, blobs)
│   ├── fileStore.js      # Système de fichiers documentaire (IndexedDB-first)
│   ├── docAI.js          # Moteur IA classification/métadonnées documents
│   ├── shipmentsRepo.js  # Expéditions : localStorage-first + Supabase sync
│   ├── suppliersRepo.js  # Fournisseurs : Supabase
│   ├── ordersRepo.js     # Commandes : Supabase
│   ├── shipments.js      # Helpers utilitaires expéditions
│   ├── profit.js         # Calculs marges/profits Amazon FBA
│   └── alertsEngine.js   # Moteur d'alertes (stocks bas, expéditions en retard)
│
└── pages/
    ├── Login.jsx         # Authentification Supabase (email/password)
    ├── Dashboard.jsx     # Tableau de bord principal (KPIs, pipeline, alertes)
    ├── Produits.jsx      # Catalogue produits Amazon (ASIN, prix, marges)
    ├── Stock.jsx         # Gestion des stocks
    ├── VentesProfit.jsx  # Ventes et analyse de profits
    ├── Expeditions.jsx   # Pipeline d'expéditions FBA (5 étapes)
    ├── Fournisseurs.jsx  # Gestion fournisseurs
    ├── Commandes.jsx     # Commandes fournisseurs
    ├── Documents.jsx     # Gestionnaire documentaire IA (⭐ voir détail ci-dessous)
    ├── AnalyseIA.jsx     # Analyse concurrentielle IA
    ├── Concurrents.jsx   # Suivi concurrents Amazon
    ├── Parametres.jsx    # Paramètres compte
    ├── QualiteSAV.jsx    # Suivi qualité et SAV
    └── NotFound.jsx      # Page 404
```

---

## Pages clés — détail

### Dashboard (`src/pages/Dashboard.jsx`)
- Hero card revenus avec gradient sombre et sparkline Recharts
- Tabs période : Hier / Aujourd'hui / 7j / 30j
- 4 KPI cards (CA, Profit, Unités, Marge)
- Pipeline visuel 5 étapes : Production → Transit → Douane → Entrepôt → FBA
- Section alertes, notes (localStorage), raccourcis
- **Données expéditions** : utilise `listShipments` de `shipmentsRepo` (pas Supabase direct)

### Documents (`src/pages/Documents.jsx`) ⭐
Gestionnaire documentaire intelligent, le module le plus complexe.

**Architecture IA en 3 phases :**
1. **Analyse** (`analyzeFiles` dans `docAI.js`) — classification par nom de fichier → catégorie + confidence + métadonnées
2. **Review** — overlay de prévisualisation des catégories détectées, avec confirmation
3. **Action** — soit upload+organisation (mode `import`), soit déplacement des nodes existants (mode `organize`)

**États IA :**
```js
AI_IDLE    = { phase:'idle' }
AI_INIT    = (total) => { phase:'analyzing', ... }
AI_REVIEW  = (results, groups, mode='import'|'organize') => { phase:'reviewing', ... }
AI_UPLOAD  = (total) => { phase:'uploading', ... }
AI_ORGANIZE= (total) => { phase:'organizing', ... }
AI_DONE    = (summary) => { phase:'done', ... }
```

**Fonctionnalités :**
- Import dossier depuis Finder (`webkitdirectory` via `useEffect setAttribute`)
- Analyse des fichiers existants (bouton "✨ Analyser avec l'IA")
- Thumbnails images : chargement blob → `URL.createObjectURL` avec cleanup
- Renommage intelligent : suggestions basées sur `aiCategory` + numérotation frères
- Détection doublons : même nom + même taille avant upload
- GridCard : preview 4:3 pour images, icône pour autres types
- Vue grille / liste
- Filtres par catégorie IA, tri, recherche

**Catégories IA** (dans `docAI.js`) :
`Photos Produit`, `Photos Packaging`, `Avant / Après`, `Vidéos`, `Factures`, `Certificats`, `Fiches de Sécurité`, `Notices`, `Amazon`, `Logistique`, `Marketing`, `Documents`

### Expéditions (`src/pages/Expeditions.jsx`)
- Pipeline visuel Kanban 5 étapes
- `shipmentsRepo.js` : localStorage-first, Supabase en best-effort sync
- `listShipments(uid)` retourne `{ data, synced }` (pas `{ data, error }`)

---

## Patterns importants

### `useData` hook (SWR maison)
```js
const { data, loading, error, reload } = useData('cache-key', async () => {
  const { data } = await supabase.from('products').select('*')
  return data
})
```
Cache Zustand avec TTL 1 min. `res?.data ?? res` pour compatibilité avec `listShipments`.

### `fileStore.js` — API fichiers
```js
// IndexedDB-first, swappable vers Supabase Storage
listNodes(userId)           // → Node[]
createFolder(userId, opts)  // → Node
uploadFiles(userId, files, parentId) // → Node[]
getFileUrl(id)              // → objectURL (à révoquer après usage)
deleteNode(id)              // récursif pour dossiers
renameNode(id, name)
moveNode(id, newParentId, allNodes)
uploadWithAIOrganize(userId, parentId, analysisResults, onProgress)
autoOrganizeNodes(userId, parentId, fileNodes, classifyFn, onProgress)
```

**Node model :**
```js
{ id, userId, type:'folder'|'file', parentId, name, createdAt, updatedAt,
  // dossiers : isProduct, asin
  // fichiers : size, mime, ext, aiCategory?, aiMetadata?, processedAt? }
```

### `shipmentsRepo.js` — Expéditions offline-first
```js
listShipments(uid)    // → { data: Shipment[], synced: boolean }
saveShipment(uid, s)  // localStorage + Supabase best-effort
deleteShipment(uid, id)
```

### Toast notifications
```js
import { toast } from '../lib/store'
toast('Message erreur')           // rouge
toast('Succès !', 'success')      // vert
```

### `theme.js` — Tokens partagés
```js
import { colors, box, inp, lbl } from '../lib/theme'
// colors.primary = '#5046e4'
// box = style objet carte standard
// inp = style objet input standard
// lbl = style objet label standard
```

---

## Base de données Supabase

Tables principales (RLS activé, `user_id = auth.uid()`) :

| Table | Description |
|-------|-------------|
| `products` | Catalogue Amazon FBA (ASIN, prix, marges) |
| `stock_entries` | Entrées/sorties de stock |
| `shipments` | Expéditions FBA (status: production/transit/customs/warehouse/fba/delivered) |
| `suppliers` | Fournisseurs |
| `orders` | Commandes fournisseurs |
| `documents` | Métadonnées docs (binaires dans IndexedDB local) |

Scripts SQL dans `supabase-schema.sql`, `supabase-missing-tables.sql`, `supabase-migration-v3.sql`, `supabase-migration-v4-shipments.sql`.

---

## Commandes utiles

```bash
npm run dev      # Dev server (port 3001 ou 5173)
npm run build    # Build production dans dist/
npm run preview  # Preview du build

git push origin HEAD:main   # Déployer en production (Vercel auto-deploy)
```

---

## Conventions de code

- **Styles** : inline `style={{ }}` partout, pas de classes Tailwind (sauf reset)
- **Couleur primaire** : `#5046e4` (indigo)
- **Pas de commentaires** sauf si comportement non-évident
- **Pas de TypeScript** — JavaScript pur
- **Animations** : `@keyframes docPop`, `docFade`, `aiPulse` déclarées en `<style>` inline dans chaque page
- **Erreurs async** : toujours `try/catch` + `toast(e.message)` + `finally { setBusy(false) }`
- **React 19** : `webkitdirectory` sur `<input>` se pose via `useEffect setAttribute` (pas en prop JSX)
- **Ref callbacks** qui manipulent le DOM parent sont à éviter (React 19 concurrent mode)

---

## Déploiement

Vercel détecte automatiquement Vite. Aucune configuration spéciale.  
Push sur `main` → build automatique → live sur https://mecarys-os.vercel.app

```json
// vercel.json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

---

## État actuel (Juin 2026)

**Fonctionnel :**
- Auth Supabase complète
- Dashboard FBA avec pipeline visuel
- Gestion produits, stock, fournisseurs, commandes
- Expéditions offline-first (localStorage + Supabase)
- Gestionnaire documentaire IA complet (IndexedDB, thumbnails, classification)
- Analyse concurrentielle IA

**Architecture prévue (pas encore implémentée) :**
- `AI_HOOKS` dans `docAI.js` : stubs prêts pour OpenAI Vision / Claude Vision / OCR
- Supabase Storage comme backend alternatif à IndexedDB (interface `StorageBackend` dans `fileStore.js`)
