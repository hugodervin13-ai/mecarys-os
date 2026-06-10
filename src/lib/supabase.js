import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

export const signUp = async (email, password) => {
  return supabase.auth.signUp({ email, password })
}

export const signIn = async (email, password) => {
  return supabase.auth.signInWithPassword({ email, password })
}

export const signOut = async () => {
  return supabase.auth.signOut()
}

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getSession()
  return data?.session?.user
}

// --- Products ---
export const getProducts = async (userId) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
  return { data, error }
}

export const addProduct = async (userId, product) => {
  const { data, error } = await supabase
    .from('products')
    .insert([{ ...product, user_id: userId }])
    .select()
  return { data, error }
}

export const updateProduct = async (id, updates) => {
  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
  return { data, error }
}

export const deleteProduct = async (id) => {
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
  return { data, error }
}

// --- Alerts ---
export const getAlerts = async (userId) => {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// --- Orders ---
export const getOrders = async (userId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, products(name, asin)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const addOrder = async (userId, order) => {
  const { data, error } = await supabase
    .from('orders')
    .insert([{ ...order, user_id: userId }])
    .select()
  return { data, error }
}

export const updateOrder = async (id, updates) => {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
  return { data, error }
}

export const deleteOrder = async (id) => {
  const { data, error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)
  return { data, error }
}

// --- Competitors ---
export const getCompetitors = async (productId) => {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('product_id', productId)
    .order('tracked_date', { ascending: false })
  return { data, error }
}

export const getAllCompetitors = async (userId) => {
  const { data, error } = await supabase
    .from('competitors')
    .select('*, products!inner(user_id, name, asin)')
    .eq('products.user_id', userId)
    .order('tracked_date', { ascending: false })
  return { data, error }
}

export const addCompetitor = async (competitor) => {
  const { data, error } = await supabase
    .from('competitors')
    .insert([competitor])
    .select()
  return { data, error }
}

export const deleteCompetitor = async (id) => {
  const { data, error } = await supabase
    .from('competitors')
    .delete()
    .eq('id', id)
  return { data, error }
}

// --- Suppliers ---
export const getSuppliers = async (userId) => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const addSupplier = async (userId, supplier) => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([{ ...supplier, user_id: userId }])
    .select()
  return { data, error }
}

export const deleteSupplier = async (id) => {
  const { data, error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)
  return { data, error }
}

// --- Shipments ---
export const getShipments = async (userId) => {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const addShipment = async (userId, shipment) => {
  const { data, error } = await supabase
    .from('shipments')
    .insert([{ ...shipment, user_id: userId }])
    .select()
  return { data, error }
}

export const updateShipment = async (id, updates) => {
  const { data, error } = await supabase
    .from('shipments')
    .update(updates)
    .eq('id', id)
    .select()
  return { data, error }
}

export const deleteShipment = async (id) => {
  const { data, error } = await supabase
    .from('shipments')
    .delete()
    .eq('id', id)
  return { data, error }
}

// --- Documents ---
export const getDocuments = async (userId) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const addDocument = async (userId, doc) => {
  const { data, error } = await supabase
    .from('documents')
    .insert([{ ...doc, user_id: userId }])
    .select()
  return { data, error }
}

export const deleteDocument = async (id) => {
  const { data, error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
  return { data, error }
}

// --- Reviews (Qualité & SAV) ---
export const getReviews = async (userId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, products(name, asin)')
    .eq('user_id', userId)
    .order('review_date', { ascending: false })
    .limit(500)
  return { data, error }
}

export const addReview = async (userId, review) => {
  const { data, error } = await supabase
    .from('reviews')
    .insert([{ ...review, user_id: userId }])
    .select()
  return { data, error }
}

export const updateReview = async (id, updates) => {
  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('id', id)
    .select()
  return { data, error }
}

export const deleteReview = async (id) => {
  const { data, error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id)
  return { data, error }
}

// --- Returns (Qualité & SAV) ---
export const getReturns = async (userId) => {
  const { data, error } = await supabase
    .from('returns')
    .select('*, products(name, asin)')
    .eq('user_id', userId)
    .order('return_date', { ascending: false })
    .limit(500)
  return { data, error }
}

export const addReturn = async (userId, ret) => {
  const { data, error } = await supabase
    .from('returns')
    .insert([{ ...ret, user_id: userId }])
    .select()
  return { data, error }
}

export const deleteReturn = async (id) => {
  const { data, error } = await supabase
    .from('returns')
    .delete()
    .eq('id', id)
  return { data, error }
}

export const uploadFile = async (userId, file) => {
  const path = `${userId}/${Date.now()}_${file.name}`
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, file)
  if (error) return { data: null, error }
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
  return { data: { path, url: urlData.publicUrl }, error: null }
}

// --- Settings ---
export const getSettings = async (userId) => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  return { data, error }
}

export const updateSettings = async (userId, settings) => {
  const { data, error } = await supabase
    .from('settings')
    .upsert({ ...settings, user_id: userId })
    .select()
  return { data, error }
}
