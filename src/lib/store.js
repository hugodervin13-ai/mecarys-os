import { create } from 'zustand'

export const useStore = create((set) => ({
  user: null,
  products: [],
  alerts: [],
  orders: [],
  settings: null,
  sidebarCollapsed: false,
  setUser: (user) => set({ user }),
  setProducts: (products) => set({ products }),
  setAlerts: (alerts) => set({ alerts }),
  setOrders: (orders) => set({ orders }),
  setSettings: (settings) => set({ settings }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  logout: () => set({ user: null, products: [], alerts: [], orders: [], settings: null })
}))
