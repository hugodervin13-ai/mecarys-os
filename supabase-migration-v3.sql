-- MECARYS OS — Migration v3 (Sprint 2 : profitabilité + qualité/SAV)
-- À exécuter dans le SQL Editor du dashboard Supabase.

-- 1. Colonnes de coûts pour le calcul de marge nette par ASIN
ALTER TABLE products ADD COLUMN IF NOT EXISTS fba_fee DECIMAL(10,2) DEFAULT 0;        -- frais FBA par unité (pick & pack + stockage)
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0;  -- logistique par unité (transport usine -> FBA)

-- 2. Avis clients (Qualité & SAV)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  author VARCHAR(255),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  content TEXT,
  review_date DATE DEFAULT CURRENT_DATE,
  responded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Retours produits (Qualité & SAV)
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  reason VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  cost DECIMAL(10,2) DEFAULT 0,
  return_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews" ON reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own returns" ON returns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own returns" ON returns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own returns" ON returns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own returns" ON returns FOR DELETE USING (auth.uid() = user_id);
