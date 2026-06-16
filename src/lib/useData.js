import { useEffect, useState, useCallback, useRef } from 'react'
import { useStore, toast } from './store'

const TTL = 60_000 // 1 min : les données en cache plus récentes sont servies sans refetch

// Hook de données avec cache stale-while-revalidate.
// - Sert immédiatement le cache s'il existe (navigation instantanée)
// - Refetch en arrière-plan si le cache a dépassé le TTL
// - Affiche un toast en cas d'erreur Supabase au lieu d'échouer en silence
//
// Usage : const { data, loading, reload } = useData('products', () => getProducts(user.id), [user])
export function useData(key, fetcher, deps = []) {
  const { cache, setCache } = useStore()
  const cached = cache[key]
  const [data, setData] = useState(cached?.data ?? null)
  const [loading, setLoading] = useState(!cached)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetcherRef.current()
      if (res?.error) {
        // Ne pas afficher de toast pour tables manquantes (DB pas encore migrée)
        const msg = res.error.message || ''
        const isTableMissing = msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('relation') || msg.includes('Could not find')
        if (!isTableMissing) {
          toast(`Erreur de chargement : ${msg || 'réessayez plus tard'}`)
        }
        setData([])
        setCache(key, [])
      } else {
        const value = res?.data ?? res
        setData(value)
        setCache(key, value)
      }
    } catch (e) {
      toast(`Erreur : ${e.message || 'une erreur est survenue'}`)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCache])

  useEffect(() => {
    const entry = useStore.getState().cache[key]
    if (entry) {
      setData(entry.data)
      setLoading(false)
      if (Date.now() - entry.fetchedAt > TTL) reload(true) // refresh silencieux en arrière-plan
    } else {
      reload()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reload, ...deps])

  return { data, loading, reload }
}

// Wrapper pour les mutations : affiche l'erreur, invalide le cache, retourne true si OK.
// Usage : const ok = await mutate(() => deleteOrder(id), 'orders')
export async function mutate(action, invalidateKey, successMessage) {
  try {
    const res = await action()
    if (res?.error) {
      toast(`Échec : ${res.error.message || 'opération impossible'}`)
      return false
    }
    if (invalidateKey) useStore.getState().invalidateCache(invalidateKey)
    if (successMessage) toast(successMessage, 'success')
    return true
  } catch (e) {
    toast(`Échec : ${e.message}`)
    return false
  }
}
