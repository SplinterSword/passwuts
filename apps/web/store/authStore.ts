import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  setUser: (user : any) => set({ user, loading: false }),
  logout: () => set({ user: null, loading: false }),
}))
