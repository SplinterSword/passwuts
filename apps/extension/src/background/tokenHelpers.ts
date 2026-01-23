import browser from "webextension-polyfill"
import { clearVaultKey } from "../../shared/vaultStore"

function isTokenExpired(idToken: string): boolean {
  try {
    const payload = JSON.parse(atob(idToken.split(".")[1]))
    if (!payload.exp) return true
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

async function invalidateSession() {
  await browser.storage.local.remove("idToken")
  clearVaultKey()

  browser.runtime.sendMessage({
    type: "SESSION_EXPIRED",
  })
}

async function checkAuthToken() {
  const { idToken } = await browser.storage.local.get("idToken")
  if (!idToken) return

  if (isTokenExpired(idToken)) {
    await browser.storage.local.remove("idToken")
    clearVaultKey()

    browser.runtime.sendMessage({
      type: "SESSION_EXPIRED",
    })
  }
}
export { isTokenExpired, invalidateSession, checkAuthToken }