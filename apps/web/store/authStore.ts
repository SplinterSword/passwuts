import { create } from "zustand"

export type AuthUser = {
  uid: string
  email: string | null
}

type AuthStore = {
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  setUser: (user) =>
    set({
      user,
      loading: false,
    }),

  logout: () =>
    set({
      user: null,
      loading: false,
    }),
}))
