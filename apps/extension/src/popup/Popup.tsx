import { useEffect, useState } from "react"
import { storeToken, getToken, clearToken } from "../../shared/authStorage"

const AUTH_ORIGIN = "https://your-domain.com"
const AUTH_URL = `${AUTH_ORIGIN}/auth/extension`

export default function Popup() {
  const [status, setStatus] = useState<
    "idle" | "waiting" | "authenticated"
  >("idle")

  const [tokenPreview, setTokenPreview] = useState<string | null>(null)

  // Load existing token on popup open
  useEffect(() => {
    getToken().then((token) => {
      if (token) {
        setStatus("authenticated")
        setTokenPreview(token.slice(0, 20) + "…")
      }
    })
  }, [])

  // Listen for auth result from web page
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.origin !== AUTH_ORIGIN) return

      if (event.data?.type === "EXTENSION_AUTH_SUCCESS") {
        const token = event.data.token

        await storeToken(token)
        setStatus("authenticated")
        setTokenPreview(token.slice(0, 20) + "…")
      }
    }

    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  const startLogin = () => {
    setStatus("waiting")

    window.open(
      AUTH_URL,
      "passwuts-auth",
      "width=500,height=600"
    )
  }

  const logout = async () => {
    await clearToken()
    setStatus("idle")
    setTokenPreview(null)
  }

  return (
    <div
      style={{
        padding: 16,
        width: 320,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h3>Passwuts</h3>

      {status === "idle" && (
        <button onClick={startLogin}>
          Sign in
        </button>
      )}

      {status === "waiting" && (
        <p>Waiting for authentication…</p>
      )}

      {status === "authenticated" && (
        <>
          <p>✅ Authenticated</p>
          <p style={{ fontSize: 12 }}>
            Token received:
            <br />
            <code>{tokenPreview}</code>
          </p>

          <button onClick={logout}>
            Log out
          </button>
        </>
      )}
    </div>
  )
}
