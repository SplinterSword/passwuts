import { deriveKey, encryptPassword, decryptPassword } from "@/lib/crypto"
import { useVaultStore } from "@/store/vaultStore"

export async function setupVault(
  masterPassword: string,
  uid: string
) {
  // 1. Derive key
  const key = await deriveKey(masterPassword, uid)

  // 2. Create verifier
  const { encryptedPassword, iv } =
    await encryptPassword("vault-check", key)

  // 3. Store verifier via API
  const res = await fetch("/api/vault/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      verifier: {
        encrypted: encryptedPassword,
        iv,
      },
    }),
  })

  if (!res.ok) {
    throw new Error("Vault setup failed")
  }

  // 4. Cache key in memory (unlock vault)
  useVaultStore.getState().setKey(key)
}

export async function unlockVault(
  masterPassword: string,
  uid: string
) {
  // 1. Fetch verifier
  const res = await fetch("/api/vault/meta/exists")
  if (!res.ok) {
    throw new Error("Vault not initialized")
  }

  const data = await res.json()
  const { verifier } = data

  if (!verifier?.encrypted || !verifier?.iv) {
    throw new Error("Invalid vault verifier")
  }

  // 2. Derive key
  const key = await deriveKey(masterPassword, uid)

  try {
    // 3. Attempt decryption
    const plaintext = await decryptPassword(
      verifier.encrypted,
      verifier.iv,
      key
    )

    if (plaintext !== "vault-check") {
      throw new Error("Invalid master password")
    }

    // 4. Cache key in memory
    useVaultStore.getState().setKey(key)
  } catch {
    throw new Error("Incorrect master password")
  }
}

export async function doesVaultExist(): Promise<boolean> {
  const res = await fetch("/api/vault/meta/exists")
  if (!res.ok) return false

  const data = await res.json()
  return Boolean(data.exists)
}
