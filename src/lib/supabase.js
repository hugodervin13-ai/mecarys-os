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

export const getAlerts = async (userId) => {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

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
