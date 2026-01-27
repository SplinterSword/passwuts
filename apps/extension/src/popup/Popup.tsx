'use client';

import { useEffect, useState } from "react"
import browser from "webextension-polyfill"
import { Lock, LogOut, Loader2 } from "lucide-react"

type UIState =
  | "loggedOut"
  | "locked"
  | "unlocking"
  | "unlocked"
  | "error"
  | "needsSetup"

export default function Popup() {
  const [state, setState] = useState<UIState>("loggedOut")
  const [masterPassword, setMasterPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [websiteName, setWebsiteName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<
    "password" | "username" | "email" | null
  >(null)
  const [useCustomPassword, setUseCustomPassword] = useState(false)
  const [customPassword, setCustomPassword] = useState("")
  const [passwordWarning, setPasswordWarning] = useState<string | null>(null)



  // Fetch State
  const [fetchedCreds, setFetchedCreds] = useState<{
    name: string
    username?: string
    email?: string
    password: string
  } | null>(null)

  const [fetchingCreds, setFetchingCreds] = useState(false)
  const [noCredsForSite, setNoCredsForSite] = useState(false)



  const [formErrors, setFormErrors] = useState<{
    websiteName?: string
    websiteUrl?: string
    email?: string
  }>({})

  // Load auth state
  useEffect(() => {
    browser.storage.local.get("idToken").then(({ idToken }) => {
      setState(idToken ? "locked" : "loggedOut")
    })
  }, [])

  useEffect(() => {
    setCopied(false)
  }, [generatedPassword])

  // Receive auth success
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (
        event.origin === "http://localhost:3000" &&
        event.data?.type === "EXTENSION_AUTH_SUCCESS" &&
        event.data.token
      ) {
        await browser.storage.local.set({ idToken: event.data.token })
        setState("locked")
      }
    }

    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  useEffect(() => {
    const handler = (msg: any) => {
      if (msg?.type === "SESSION_EXPIRED") {
        setState("loggedOut")
        setMasterPassword("")
        setError("Session expired. Please sign in again.")
      }
    }

    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
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

    setState("loggedOut")
    setError(null)
    setMasterPassword("")
  }

  const unlockVault = async () => {
    setState("unlocking")
    setError(null)

    const res = await browser.runtime.sendMessage({
      type: "VERIFY_AND_UNLOCK_VAULT",
      masterPassword,
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

    const site = await browser.runtime.sendMessage({
      type: "GET_ACTIVE_SITE_INFO",
    })

    if (site) {
      setWebsiteUrl(site.url ?? "")
      setWebsiteName(site.name ?? "")
    }

    setMasterPassword("")
    setState("unlocked")
  }

  const generatePassword = async () => {
    const res = await browser.runtime.sendMessage({
      type: "GENERATE_PASSWORD",
    })

    if (res?.password) {
      setGeneratedPassword(res.password)
      setUseCustomPassword(false)
      setCustomPassword("")
      setPasswordWarning(null)
    }
  }

  const validateForm = () => {
    const errors: typeof formErrors = {}

    if (!websiteName.trim()) {
      errors.websiteName = "Website name is required"
    }

    if (!websiteUrl.trim()) {
      errors.websiteUrl = "Website URL is required"
    } else {
      try {
        new URL(websiteUrl)
      } catch {
        errors.websiteUrl = "Enter a valid URL"
      }
    }

    if (!email.trim()) {
      errors.email = "Email is required"
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = "Enter a valid email"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const savePassword = async () => {
    const passwordToSave = useCustomPassword
      ? customPassword
      : generatedPassword

    if (!passwordToSave) return
    if (!validateForm()) return

    setSaving(true)
    setError(null)

    const res = await browser.runtime.sendMessage({
      type: "GENERATE_AND_SAVE_PASSWORD",
      payload: {
        name: websiteName,
        url: websiteUrl,
        username,
        email,
        password: passwordToSave,
      },
    })

    setSaving(false)

    if (res?.error) {
      setError(res.error)
      return
    }

    setUsername("")
    setEmail("")
    setGeneratedPassword("")
    setFormErrors({})
  }

  const fetchCredentials = async () => {
    setFetchingCreds(true)
    setError(null)
    setFetchedCreds(null)
    setNoCredsForSite(false)

    const res = await browser.runtime.sendMessage({
      type: "GET_CREDENTIALS_FOR_SITE",
    })

    setFetchingCreds(false)

    if (res?.error) {
      setError(res.error)
      return
    }

    if (!res?.found) {
      setNoCredsForSite(true)
      return
    }

    setFetchedCreds({
      name: res.name,
      username: res.username,
      email: res.email,
      password: res.password,
    })
  }

  const copyValue = async (value: string, field: "password" | "username" | "email") => {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 1500)
  }


  const isFormComplete =
    websiteName.trim() &&
    websiteUrl.trim() &&
    email.trim() &&
    (useCustomPassword ? customPassword : generatedPassword)

  return (
    <div style={container}>
      <header style={header}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Lock size={16} color="rgb(255,151,29)" />
          <strong>Passwuts</strong>
        </div>
        {state === "unlocked" && (
          <button onClick={logout} style={iconBtn}>
            <LogOut size={14} />
          </button>
        )}
      </header>

      <div style={card}>
        {state === "loggedOut" && (
          <button onClick={login} style={primaryBtn}>Sign in</button>
        )}

        {state === "locked" && (
          <>
            <input
              type="password"
              placeholder="Master password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              style={input}
            />
            <button onClick={unlockVault} style={primaryBtn}>
              Unlock Vault
            </button>
          </>
        )}

        {state === "unlocking" && (
          <div style={{ textAlign: "center", color: "#aaa" }}>
            <Loader2 size={16} /> Unlocking…
          </div>
        )}

        {state === "needsSetup" && (
          <>
            <p style={{ color: "#aaa" }}>Vault not set up.</p>
            <button
              onClick={() => window.open("http://localhost:3000", "_blank")}
              style={primaryBtn}
            >
              Set up vault
            </button>
          </>
        )}

        {state === "error" && (
          <>
            <p style={errorText}>{error}</p>
            <button onClick={() => setState("locked")} style={secondaryBtn}>
              Try again
            </button>
          </>
        )}

        {state === "unlocked" && (
          <>
            <input
              value={websiteName}
              onChange={(e) => {
                setWebsiteName(e.target.value)
                if (formErrors.websiteName)
                  setFormErrors((p) => ({ ...p, websiteName: undefined }))
              }}
              placeholder="Website name"
              style={input}
            />
            {formErrors.websiteName && <span style={errorText}>{formErrors.websiteName}</span>}

            <input
              value={websiteUrl}
              onChange={(e) => {
                setWebsiteUrl(e.target.value)
                if (formErrors.websiteUrl)
                  setFormErrors((p) => ({ ...p, websiteUrl: undefined }))
              }}
              placeholder="Website URL"
              style={input}
            />
            {formErrors.websiteUrl && <span style={errorText}>{formErrors.websiteUrl}</span>}

            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (optional)"
              style={input}
            />

            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (formErrors.email)
                  setFormErrors((p) => ({ ...p, email: undefined }))
              }}
              placeholder="Email"
              style={input}
            />
            {formErrors.email && <span style={errorText}>{formErrors.email}</span>}

            <button
              onClick={() => {
                setUseCustomPassword((p) => !p)
                setGeneratedPassword("")
                setPasswordWarning(null)
              }}
              style={secondaryBtn}
            >
              {useCustomPassword ? "Use generated password" : "Enter password manually"}
            </button>

            {useCustomPassword ? (
              <>
                <input
                  type={showPassword ? "text" : "password"}
                  value={customPassword}
                  onChange={(e) => {
                    setCustomPassword(e.target.value)
                    checkPasswordStrength(e.target.value)
                  }}
                  placeholder="Enter your password"
                  style={input}
                />

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setShowPassword((p) => !p)}
                    style={secondaryBtn}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {passwordWarning && (
                  <span style={{ color: "rgb(251,191,36)", fontSize: 12 }}>
                    ⚠️ {passwordWarning}
                  </span>
                )}
              </>
            ) : (
              <>
                <button onClick={generatePassword} style={secondaryBtn}>
                  Generate Password
                </button>

                {generatedPassword && (
                  <div style={passwordBox}>
                    <code style={passwordText}>{generatedPassword}</code>

                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(generatedPassword)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1500)
                      }}
                      style={copyBtn}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}
              </>
            )}


            {generatedPassword && (
              <div style={passwordBox}>
                <code style={passwordText}>{generatedPassword}</code>

                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(generatedPassword)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }}
                  style={copyBtn}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}

            <button
              onClick={savePassword}
              disabled={saving || !isFormComplete}
              style={{
                ...primaryBtn,
                opacity: saving || !isFormComplete ? 0.6 : 1,
                cursor: saving || !isFormComplete ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving…" : "Save Password"}
            </button>

            <button
              onClick={fetchCredentials}
              style={secondaryBtn}
            >
              {fetchingCreds ? "Checking…" : "Get Credentials for this site"}
            </button>

            {fetchedCreds && (
              <div style={passwordBox}>
                <div style={{ flex: 1 }}>
                  {/* Site */}
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    {fetchedCreds.name}
                  </div>

                  {/* Username */}
                  {fetchedCreds.username && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 12,
                        color: "#aaa",
                        marginBottom: 4,
                      }}
                    >
                      <span>Username: {fetchedCreds.username}</span>
                      <button
                        onClick={() => copyValue(fetchedCreds.username!, "username")}
                        style={copyBtn}
                      >
                        {copiedField === "username" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  )}

                  {/* Email */}
                  {fetchedCreds.email && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 12,
                        color: "#aaa",
                        marginBottom: 8,
                      }}
                    >
                      <span>Email: {fetchedCreds.email}</span>
                      <button
                        onClick={() => copyValue(fetchedCreds.email!, "email")}
                        style={copyBtn}
                      >
                        {copiedField === "email" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  )}

                  {/* Password */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <code style={passwordText}>
                      {showPassword
                        ? fetchedCreds.password
                        : "•".repeat(fetchedCreds.password.length)}
                    </code>

                    <button
                      onClick={() => setShowPassword((p) => !p)}
                      style={copyBtn}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>

                    <button
                      onClick={() => copyValue(fetchedCreds.password, "password")}
                      style={copyBtn}
                    >
                      {copiedField === "password" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {noCredsForSite && (
              <div
                style={{
                  background: "rgb(24,24,27)",
                  border: "1px dashed rgb(63,63,70)",
                  borderRadius: 8,
                  padding: "12px",
                  color: "#aaa",
                  fontSize: 13,
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  No credentials found for this website.
                </div>

                <div style={{ fontSize: 12 }}>
                  Generate a password below to securely save one.
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}

/* ───────── styles ───────── */

const container = {
  width: 360,
  minHeight: 420,
  background: "rgb(24,24,27)",
  color: "#fff",
  padding: 16,
  fontFamily: "Lato, system-ui, sans-serif",
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 16,
}

const card = {
  background: "rgb(39,39,42)",
  border: "1px solid rgb(63,63,70)",
  borderRadius: 8,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
}

const input = {
  background: "rgb(24,24,27)",
  border: "1px solid rgb(63,63,70)",
  borderRadius: 6,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 14,
}

const primaryBtn = {
  background: "rgb(255,151,29)",
  border: "none",
  borderRadius: 6,
  padding: "10px 12px",
  fontWeight: 600,
  cursor: "pointer",
}

const secondaryBtn = {
  background: "transparent",
  border: "1px solid rgb(63,63,70)",
  borderRadius: 6,
  padding: "10px 12px",
  color: "#fff",
  cursor: "pointer",
}

const iconBtn = {
  background: "none",
  border: "none",
  color: "#aaa",
  cursor: "pointer",
}

const errorText = {
  color: "rgb(239,68,68)",
  fontSize: 12,
}

const passwordBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  background: "rgb(24,24,27)",
  border: "1px solid rgb(255,151,29)",
  borderRadius: 8,
  padding: "10px 12px",
}

const passwordText = {
  fontSize: 14,
  fontFamily: "Geist Mono, monospace",
  letterSpacing: "0.5px",
  color: "rgb(255,151,29)",
  wordBreak: "break-all" as const,
  flex: 1,
}

const copyBtn = {
  background: "transparent",
  border: "1px solid rgb(63,63,70)",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 12,
  color: "#fff",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
}

