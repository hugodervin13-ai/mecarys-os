import { create } from 'zustand'

let toastId = 0

export const useStore = create((set) => ({
  user: null,
  products: [],
  alerts: [],
  orders: [],
  settings: null,
  sidebarOpen: true,
  toasts: [],
  // cache: { [key]: { data, fetchedAt } }
  cache: {},
  setUser: (user) => set({ user }),
  setProducts: (products) => set({ products }),
  setAlerts: (alerts) => set({ alerts }),
  setOrders: (orders) => set({ orders }),
  setSettings: (settings) => set({ settings }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  addToast: (message, type = 'error') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }))
    }, 5000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  setCache: (key, data) => set((s) => ({ cache: { ...s.cache, [key]: { data, fetchedAt: Date.now() } } })),
  invalidateCache: (keyPrefix) => set((s) => ({
    cache: Object.fromEntries(Object.entries(s.cache).filter(([k]) => !k.startsWith(keyPrefix))),
  })),
  logout: () => set({ user: null, products: [], alerts: [], orders: [], settings: null, cache: {} }),
}))

// Helper hors-composant pour afficher un toast depuis n'importe où
export const toast = (message, type = 'error') => useStore.getState().addToast(message, type)
