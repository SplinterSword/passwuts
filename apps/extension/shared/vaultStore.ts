let cryptoKey: CryptoKey | null = null
let unlockedAt: number | null = null

const AUTO_LOCK_MS = 5 * 60 * 1000 // 5 minutes

export function setVaultKey(key: CryptoKey) {
  cryptoKey = key
  unlockedAt = Date.now()
}

export function getVaultKey() {
  if (!cryptoKey || !unlockedAt) return null

  if (Date.now() - unlockedAt > AUTO_LOCK_MS) {
    clearVaultKey()
    return null
  }

  return cryptoKey
}

export function clearVaultKey() {
  cryptoKey = null
  unlockedAt = null
}
