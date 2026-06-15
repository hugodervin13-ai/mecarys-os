# MECARYS OS

ERP Amazon FBA — gestion complète de l'activité e-commerce : produits, commandes fournisseurs, expéditions, stock, concurrents, documents et analyse IA de listings.

## Stack

- **Frontend** : React 19 + Vite 6, React Router 7, Zustand, Recharts
- **Backend** : Supabase (PostgreSQL + RLS, Auth, Storage, Edge Functions Deno)
- **IA** : Google Gemini (analyse ASIN) via Edge Function

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis remplir les clés Supabase
npm run dev                   # http://localhost:5173
```

## Base de données

Le schéma complet (tables + politiques RLS) est dans `supabase-schema.sql`.
À exécuter dans le SQL Editor du dashboard Supabase.

Tables : `products`, `orders`, `shipments`, `competitors`, `suppliers`, `documents`, `alerts`, `settings` — toutes protégées par RLS (`auth.uid() = user_id`).

**Storage** : créer un bucket public `documents` pour l'upload de fichiers.

## Edge Functions

```bash
supabase login
supabase link --project-ref VOTRE_REF
supabase secrets set GEMINI_API_KEY=votre_cle
supabase functions deploy analyse-asin
```

## Architecture du code

```
src/
├── pages/           # Une page par module (lazy-loaded)
├── components/      # Layout, Sidebar, Modal, ui.jsx (Toast, badges, KPI...)
├── lib/
│   ├── supabase.js  # Client + toutes les requêtes (retourne { data, error })
│   ├── store.js     # Zustand : auth, UI, toasts, cache
│   ├── useData.js   # Hook de fetch avec cache stale-while-revalidate
│   ├── theme.js     # Design tokens (couleurs, styles partagés)
│   └── utils.js     # Formatage devise/dates
```

### Conventions

- **Styles** : inline styles + tokens importés depuis `lib/theme.js` (pas de classes Tailwind dans les pages)
- **Données** : `useData(key, fetcher)` pour les lectures (cache 1 min), `mutate(action, cacheKey)` pour les écritures
- **Erreurs** : jamais silencieuses — toast automatique via `useData`/`mutate`, crash UI attrapé par `ErrorBoundary`
- **Démo** : les pages sans données réelles affichent le badge `<DemoBadge />`

## Build & déploiement

```bash
npm run build   # dist/ — déployé automatiquement sur Vercel à chaque push
```
