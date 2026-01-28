"use client"

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { useState } from "react"
import { Lock } from "lucide-react"
import auth from "@/lib/Firebase/initialize"

export default function ExtensionAuthPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const APP_ORIGIN = new URL(__APP_URL__).origin

  const login = async () => {
    try {
      setLoading(true)
      const provider = new GoogleAuthProvider()

      const result = await signInWithPopup(auth, provider)
      const token = await result.user.getIdToken()

      window.opener?.postMessage(
        { type: "EXTENSION_AUTH_SUCCESS", token },
        APP_ORIGIN
      )

      setTimeout(() => {
        window.close()
      }, 100)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl bg-primary/20 flex items-center justify-center">
              <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Passwuts</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Extension Authentication</p>
        </div>

        {/* Auth Card */}
        <div className="bg-secondary border border-border rounded-2xl p-6 sm:p-8 shadow-lg">
          {!error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="text-center">
                <button
                  onClick={login}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-foreground font-semibold py-3 rounded-lg transition-colors"
                >
                  {loading ? "Signing in…" : "Sign in with Google"}
                </button>
                <p className="text-sm text-muted-foreground mt-4">Please complete authentication in the popup window</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-semibold text-destructive mb-2">Authentication Failed</h2>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <p className="text-xs text-muted-foreground">Please close this window and try again</p>
            </div>
          ) : null}

          {/* Security Info */}
          <div className="space-y-3 text-xs sm:text-sm text-muted-foreground text-center mt-6">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span>Secure Extension Connection</span>
            </div>
            <p>Your authentication token is securely transmitted to the extension</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs sm:text-sm text-muted-foreground text-center mt-6 sm:mt-8">
          This page authenticates your Passwuts browser extension
        </p>
      </div>
    </div>
  )
}
