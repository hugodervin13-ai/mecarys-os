import { create } from 'zustand'

export const useStore = create((set) => ({
  user: null,
  products: [],
  alerts: [],
  orders: [],
  settings: null,
  sidebarOpen: true,
  setUser: (user) => set({ user }),
  setProducts: (products) => set({ products }),
  setAlerts: (alerts) => set({ alerts }),
  setOrders: (orders) => set({ orders }),
  setSettings: (settings) => set({ settings }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  logout: () => set({ user: null, products: [], alerts: [], orders: [], settings: null })
}))
