import browser from "webextension-polyfill"

const TOKEN_KEY = "idToken"
const LOGIN_TIME_KEY = "loggedInAt"

export async function storeToken(token: string) {
  await browser.storage.local.set({
    [TOKEN_KEY]: token,
    [LOGIN_TIME_KEY]: Date.now(),
  })
}

export async function getToken(): Promise<string | null> {
  const res = await browser.storage.local.get(TOKEN_KEY)
  return res[TOKEN_KEY] ?? null
}

export async function clearToken() {
  await browser.storage.local.remove([TOKEN_KEY, LOGIN_TIME_KEY])
}
