'use client';

import { useEffect, useState } from "react"
import browser from "webextension-polyfill"
import { Lock, LogOut, Loader2 } from "lucide-react"

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
        event.origin === "http://localhost:3000" &&
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
      "http://localhost:3000/extension",
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
    <div 
      style={{
        width: "360px",
        minHeight: "420px",
        background: "rgb(24, 24, 27)",
        color: "rgb(250, 250, 251)",
        padding: "16px",
        fontFamily: "Lato, system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div 
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "rgba(255, 151, 29, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Lock style={{ width: "16px", height: "16px", color: "rgb(255, 151, 29)" }} />
          </div>
          <h1 style={{ fontSize: "16px", fontWeight: "600" }}>Passwuts</h1>
        </div>
        {state === "unlocked" && (
          <button
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              color: "rgb(161, 161, 170)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "4px",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "rgb(250, 250, 251)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "rgb(161, 161, 170)"}
          >
            <LogOut style={{ width: "14px", height: "14px" }} />
            Log out
          </button>
        )}
      </header>

      {/* Card */}
      <div 
        style={{
          background: "rgb(39, 39, 42)",
          border: "1px solid rgb(63, 63, 70)",
          borderRadius: "8px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Logged out */}
        {state === "loggedOut" && (
          <button
            onClick={login}
            style={{
              width: "100%",
              background: "rgb(255, 151, 29)",
              color: "rgb(24, 24, 27)",
              border: "none",
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            Sign in
          </button>
        )}

        {/* Locked */}
        {state === "locked" && (
          <>
            <input
              type="password"
              placeholder="Master password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                borderRadius: "6px",
                background: "rgb(24, 24, 27)",
                border: "1px solid rgb(63, 63, 70)",
                padding: "10px 12px",
                fontSize: "14px",
                color: "rgb(250, 250, 251)",
                boxSizing: "border-box",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "rgb(255, 151, 29)"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgb(63, 63, 70)"}
            />

            <button
              onClick={unlockVault}
              style={{
                width: "100%",
                background: "rgb(255, 151, 29)",
                color: "rgb(24, 24, 27)",
                border: "none",
                borderRadius: "6px",
                padding: "10px 12px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Unlock Vault
            </button>
          </>
        )}

        {/* Unlocking */}
        {state === "unlocking" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "16px 0" }}>
            <Loader2 style={{ width: "16px", height: "16px", color: "rgb(255, 151, 29)", animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: "14px", color: "rgb(161, 161, 170)" }}>Unlocking…</p>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <>
            <p style={{ fontSize: "14px", color: "rgb(239, 68, 68)" }}>{error}</p>
            <button
              onClick={() => setState("locked")}
              style={{
                width: "100%",
                background: "transparent",
                border: "1px solid rgb(63, 63, 70)",
                borderRadius: "6px",
                padding: "10px 12px",
                fontSize: "14px",
                color: "rgb(250, 250, 251)",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgb(63, 63, 70)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              Try again
            </button>
          </>
        )}

        {/* Needs setup */}
        {state === "needsSetup" && (
          <>
            <p style={{ fontSize: "14px", color: "rgb(161, 161, 170)" }}>
              Your vault is not set up yet.
            </p>
            <button
              onClick={() => window.open("http://localhost:3000/", "_blank")}
              style={{
                width: "100%",
                background: "rgb(255, 151, 29)",
                color: "rgb(24, 24, 27)",
                border: "none",
                borderRadius: "6px",
                padding: "10px 12px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Set up vault
            </button>
            <button
              onClick={() => setState("locked")}
              style={{
                width: "100%",
                background: "transparent",
                border: "1px solid rgb(63, 63, 70)",
                borderRadius: "6px",
                padding: "10px 12px",
                fontSize: "14px",
                color: "rgb(250, 250, 251)",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgb(63, 63, 70)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              Retry
            </button>
          </>
        )}

        {/* Unlocked */}
        {state === "unlocked" && (
          <ul 
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {items.map((item) => (
              <li
                key={item.id}
                style={{
                  border: "1px solid rgb(63, 63, 70)",
                  borderRadius: "6px",
                  padding: "12px",
                  background: "rgb(24, 24, 27)",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: "500" }}>{item.name}</div>
                {item.username && (
                  <div style={{ fontSize: "12px", color: "rgb(161, 161, 170)", marginTop: "4px" }}>
                    {item.username}
                  </div>
                )}
                <code 
                  style={{
                    display: "block",
                    marginTop: "8px",
                    fontSize: "12px",
                    fontFamily: "Geist Mono, monospace",
                    wordBreak: "break-all",
                    color: "rgb(161, 161, 170)",
                  }}
                >
                  {item.password}
                </code>
              </li>
            ))}
          </ul>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
