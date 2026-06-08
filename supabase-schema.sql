-- MECARYS OS - Supabase Schema
-- Run this in Supabase SQL Editor to create all tables

-- Products (Produits Amazon)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asin VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price_current DECIMAL(10,2),
  cost DECIMAL(10,2),
  units_sold_30d INTEGER DEFAULT 0,
  revenue_30d DECIMAL(12,2) DEFAULT 0,
  profit_30d DECIMAL(12,2) DEFAULT 0,
  acos DECIMAL(5,2) DEFAULT 0,
  stock_fba INTEGER DEFAULT 0,
  stock_alerte INTEGER DEFAULT 20,
  rating DECIMAL(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitors
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  competitor_asin VARCHAR(10),
  competitor_name VARCHAR(255),
  competitor_price DECIMAL(10,2),
  competitor_rating DECIMAL(3,2),
  price_difference DECIMAL(10,2),
  tracked_date TIMESTAMPTZ DEFAULT NOW()
);

-- Orders (Commandes fournisseurs)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number VARCHAR(50),
  supplier VARCHAR(255),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER,
  cost_total DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pending',
  order_date TIMESTAMPTZ,
  expected_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  message TEXT,
  severity VARCHAR(20),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  currency VARCHAR(3) DEFAULT 'EUR',
  language VARCHAR(5) DEFAULT 'fr',
  theme VARCHAR(10) DEFAULT 'dark'
);

-- Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
CREATE POLICY "Users can view own products" ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON products FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own competitors" ON competitors FOR SELECT USING (
  product_id IN (SELECT id FROM products WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own competitors" ON competitors FOR INSERT WITH CHECK (
  product_id IN (SELECT id FROM products WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own competitors" ON competitors FOR DELETE USING (
  product_id IN (SELECT id FROM products WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own orders" ON orders FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own alerts" ON alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON alerts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own settings" ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON settings FOR UPDATE USING (auth.uid() = user_id);
