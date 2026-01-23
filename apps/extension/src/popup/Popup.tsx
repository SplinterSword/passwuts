import { useEffect, useState } from "react"
import browser from "webextension-polyfill"

type VaultItem = {
  id: string
  name: string
  username?: string
  password: string
}

type UIState =
  | "loggedOut"
  | "locked"
  | "unlocking"
  | "unlocked"
  | "error"
  | "needsSetup"

export default function Popup() {
  const [state, setState] = useState<UIState>("loggedOut")
  const [password, setPassword] = useState("")
  const [items, setItems] = useState<VaultItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // Load auth state
  useEffect(() => {
    browser.storage.local.get("idToken").then(({ idToken }) => {
      if (idToken) setState("locked")
    })
  }, [])

  // Receive auth success
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (
        event.origin === "https://your-domain.com" &&
        event.data?.type === "EXTENSION_AUTH_SUCCESS"
      ) {
        await browser.storage.local.set({ idToken: event.data.token })
        setState("locked")
      }
    }

    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  const login = () => {
    window.open(
      "https://your-domain.com/auth/extension",
      "passwuts-auth",
      "width=500,height=600"
    )
  }

  const logout = async () => {
    await browser.runtime.sendMessage({ type: "VAULT_LOCK" })
    await browser.storage.local.remove("idToken")

    setItems([])
    setPassword("")
    setError(null)
    setState("loggedOut")
  }

  const unlockVault = async () => {
    setState("unlocking")
    setError(null)

    const res = await browser.runtime.sendMessage({
      type: "VERIFY_AND_UNLOCK_VAULT",
      masterPassword: password,
    })

    if (res?.needsSetup) {
      setState("needsSetup")
      return
    }

    if (res?.error) {
      setError(res.error)
      setState("error")
      return
    }

    const vault = await browser.runtime.sendMessage({
      type: "FETCH_VAULT_ITEMS",
    })

    if (vault?.error) {
      setError(vault.error)
      setState("error")
      return
    }

    setItems(vault.items)
    setPassword("")
    setState("unlocked")
  }

  return (
    <div style={{ padding: 16, width: 320 }}>
      <h3>Passwuts</h3>

      {state === "loggedOut" && (
        <button onClick={login}>Sign in</button>
      )}

      {state === "locked" && (
        <>
          <input
            type="password"
            placeholder="Master password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={unlockVault}>Unlock Vault</button>
        </>
      )}

      {state === "unlocking" && <p>Unlocking…</p>}

      {state === "error" && (
        <>
          <p style={{ color: "red" }}>{error}</p>
          <button onClick={() => setState("locked")}>Try again</button>
        </>
      )}

      {state === "needsSetup" && (
        <>
          <p>Your vault is not set up yet.</p>
          <a
            href="https://your-domain.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Set up vault on Passwuts
          </a>
          <button onClick={() => setState("locked")}>Retry</button>
        </>
      )}

      {state === "unlocked" && (
        <>
          <button onClick={logout}>Log out</button>

          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong>
                <div>{item.username}</div>
                <code>{item.password}</code>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
