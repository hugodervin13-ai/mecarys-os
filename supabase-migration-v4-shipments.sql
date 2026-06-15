-- MECARYS OS — Migration v4 (Module Expéditions / Transport enrichi)
-- À exécuter dans le SQL Editor du dashboard Supabase POUR migrer la
-- persistance locale (localStorage) vers la base de données.
-- Tant que cette migration n'est pas appliquée, le module fonctionne
-- en persistance localStorage (par utilisateur) — les données restent
-- présentes après actualisation et redémarrage du navigateur.

-- Colonnes enrichies sur la table shipments existante
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS supplier        VARCHAR(255);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS product         VARCHAR(255);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS quantity        INTEGER DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS country_from    VARCHAR(100);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS country_to      VARCHAR(100);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS transport_type  VARCHAR(20) DEFAULT 'bateau';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS transport_cost  DECIMAL(10,2) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS order_date      DATE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS departure_date  DATE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS actual_arrival  DATE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS notes           TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS archived        BOOLEAN DEFAULT FALSE;

-- Le statut accepte désormais le workflow complet :
-- draft, ordered, production, ready, shipped, transit, customs, warehouse, fba, closed
ALTER TABLE shipments ALTER COLUMN status SET DEFAULT 'draft';

-- Les colonnes legacy `origin`/`destination` restent en place (compatibilité).
-- Les nouvelles colonnes country_from/country_to les remplacent côté UI.
