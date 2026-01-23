import browser from "webextension-polyfill"
import { deriveKey, decryptPassword, encryptPassword } from "@pm/crypto"
import { setVaultKey, getVaultKey, clearVaultKey } from "../../shared/vaultStore"
import { generateSecurePassword } from "./passwordGenerator"

browser.runtime.onMessage.addListener(async (msg: any) => {
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
      * Get active tab site info
      */
      case "GET_ACTIVE_SITE_INFO": {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        })

        if (!tab?.url) return {}

        const url = new URL(tab.url)

        return {
          url: url.origin,
          name: url.hostname.replace(/^www\./, ""),
        }
      }

      /**
       * Generate password only
       */
      case "GENERATE_PASSWORD": {
        return {
          password: generateSecurePassword(16),
        }
      }

      /**
       * Encrypt & save password
       */
      case "GENERATE_AND_SAVE_PASSWORD": {
        const key = getVaultKey()
        if (!key) {
          return { error: "Vault is locked" }
        }

        const { idToken } = await browser.storage.local.get("idToken")
        if (!idToken) {
          return { error: "Not authenticated" }
        }

        const {
          name,
          url,
          username,
          email,
          password,
        } = msg.payload || {}

        if (!name || !url || !password) {
          return { error: "Missing required fields" }
        }

        // Encrypt using vault key (same as web app)
        const { encryptedPassword, iv } = await encryptPassword(
          password,
          key
        )

        const res = await fetch(
          "http://localhost:3000/api/vault",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              name,
              url,
              username,
              email,
              encryptedPassword,
              iv,
              hasWarning: password.length < 12,
              isFavorite: false,
            }),
          }
        )

        if (!res.ok) {
          return { error: "Failed to save password" }
        }

        return { success: true }
      }

      case "AUTOFILL_CURRENT_SITE": {
        const key = getVaultKey()
        if (!key) {
          return { error: "Vault is locked" }
        }

        const { idToken } = await browser.storage.local.get("idToken")
        if (!idToken) {
          return { error: "Not authenticated" }
        }

        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        })

        if (!tab?.url || !tab.id) {
          return { error: "No active tab" }
        }

        const origin = new URL(tab.url).origin

        // Fetch vault items
        const res = await fetch("http://localhost:3000/api/vault", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        })

        if (!res.ok) {
          return { error: "Failed to fetch vault" }
        }

        const items = await res.json()

        const match = items.find((item: any) => item.url === origin)
        if (!match) {
          return { error: "No saved password for this site" }
        }

        const password = await decryptPassword(
          match.encryptedPassword,
          match.iv,
          key
        )

        await browser.tabs.sendMessage(tab.id, {
          type: "AUTOFILL_CREDENTIALS",
          payload: {
            username: match.username ?? match.email,
            password,
          },
        })

        return { success: true }
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
