import { create } from "zustand"

interface VaultState {
  cryptoKey: CryptoKey | null
  isUnlocked: boolean
  refreshCounter: number
  setKey: (key: CryptoKey) => void
  lock: () => void
  triggerRefresh: () => void
}

export const useVaultStore = create<VaultState>((set) => ({
  cryptoKey: null,
  isUnlocked: false,
  refreshCounter: 0,

  setKey: (key) =>
    set({
      cryptoKey: key,
      isUnlocked: true,
    }),

  lock: () =>
    set({
      cryptoKey: null,
      isUnlocked: false,
    }),
  triggerRefresh: () =>
    set((s) => ({ refreshCounter: s.refreshCounter + 1 })),
}))
