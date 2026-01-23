import browser from "webextension-polyfill"
import { deriveKey, decryptPassword } from "@pm/crypto"
import { setVaultKey, getVaultKey, clearVaultKey } from "../../shared/vaultStore"

browser.runtime.onMessage.addListener(async (msg) => {
  try {
    switch (msg.type) {
      /**
       * VERIFY + UNLOCK
       */
      case "VERIFY_AND_UNLOCK_VAULT": {
        const { masterPassword } = msg

        const { idToken } = await browser.storage.local.get("idToken")
        if (!idToken) {
          return { error: "Not authenticated" }
        }

        // 1️⃣ Fetch vault metadata
        const metaRes = await fetch(
          "http://localhost:3000/api/vault/meta/exists",
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        )

        if (!metaRes.ok) {
          return { needsSetup: true }
        }

        const meta = await metaRes.json()
        const verifier = meta.verifier

        if (!verifier?.encrypted || !verifier?.iv) {
          return { error: "Invalid vault metadata" }
        }

        // 2️⃣ Extract UID from ID token
        const payload = JSON.parse(atob(idToken.split(".")[1]))
        const uid = payload.user_id

        // 3️⃣ Derive key (IDENTICAL to web app)
        const key = await deriveKey(masterPassword, uid)

        try {
          // 4️⃣ Verify password
          const plaintext = await decryptPassword(
            verifier.encrypted,
            verifier.iv,
            key
          )

          if (plaintext !== "vault-check") {
            throw new Error("Invalid password")
          }

          // 5️⃣ Unlock vault
          setVaultKey(key)
          return { success: true }
        } catch {
          return { error: "Incorrect master password" }
        }
      }

      /**
       * FETCH + DECRYPT VAULT
       */
      case "FETCH_VAULT_ITEMS": {
        const key = getVaultKey()
        if (!key) return { error: "Vault locked" }

        const { idToken } = await browser.storage.local.get("idToken")
        if (!idToken) return { error: "Not authenticated" }

        const res = await fetch(
          "http://localhost:3000/api/vault",
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        )

        if (!res.ok) {
          return { error: "Failed to fetch vault" }
        }

        const items = await res.json()

        const decrypted = await Promise.all(
          items.map(async (item: any) => ({
            ...item,
            password: await decryptPassword(
              item.encryptedPassword,
              item.iv,
              key
            ),
          }))
        )

        return { items: decrypted }
      }

      /**
       * LOCK VAULT
       */
      case "VAULT_LOCK": {
        clearVaultKey()
        return { success: true }
      }

      default:
        return
    }
  } catch (err: any) {
    return { error: err.message }
  }
})
