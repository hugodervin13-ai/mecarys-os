-- ============================================================
-- TABLES MANQUANTES — a coller dans Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  country       TEXT,
  contact_email TEXT,
  phone         TEXT,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_suppliers" ON public.suppliers
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.shipments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reference       TEXT NOT NULL,
  origin          TEXT,
  destination     TEXT,
  carrier         TEXT,
  tracking_number TEXT,
  items           INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'transit' CHECK (status IN ('production','transit','customs','warehouse','fba','delivered')),
  eta             DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_shipments" ON public.shipments
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id  UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  type        TEXT DEFAULT 'autre' CHECK (type IN ('photo','video','facture','certificat','commande','technique','packaging','listing','autre')),
  file_url    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_documents" ON public.documents
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
