import { create } from "zustand"

interface VaultState {
  cryptoKey: CryptoKey | null
  isUnlocked: boolean
  setKey: (key: CryptoKey) => void
  lock: () => void
}

export const useVaultStore = create<VaultState>((set) => ({
  cryptoKey: null,
  isUnlocked: false,

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
}))
