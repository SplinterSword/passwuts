import { useEffect, useState } from "react"
import browser from "webextension-polyfill"

export default function Popup() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load token on popup open
    browser.storage.local.get("idToken").then(({ idToken }) => {
      if (idToken) setToken(idToken)
    })

    const handler = async (event: MessageEvent) => {
      if (
        event.origin === "http://localhost:3000" &&
        event.data?.type === "EXTENSION_AUTH_SUCCESS"
      ) {
        const token = event.data.token
        await browser.storage.local.set({ idToken: token })
        setToken(token)
        setLoading(false)
      }
    }

    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  const login = () => {
    setLoading(true)
    window.open(
      "http://localhost:3000/extension",
      "passwuts-auth",
      "width=500,height=600"
    )
  }

  const logout = async () => {
    // 1️⃣ Remove token
    await browser.storage.local.remove("idToken")

    // 2️⃣ Reset local state
    setToken(null)

    // Optional: reset UI flags
    setLoading(false)
  }

  if (token) {
    return (
      <div style={{ padding: 16 }}>
        <h3>Passwuts</h3>

        <p style={{ color: "#16a34a" }}>✅ Logged in</p>

        <button
          onClick={logout}
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <h3>Passwuts</h3>

      <button onClick={login} disabled={loading}>
        {loading ? "Waiting for login…" : "Sign in"}
      </button>
    </div>
  )
}
