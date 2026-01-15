"use client"

import { useEffect, useState } from "react"
import { VaultSetupModal } from "@/components/vault-setup-modal"
import { useAuthStore } from "@/store/authStore"

export function VaultSetupGate({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useAuthStore((s) => s.user)

  const [checking, setChecking] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    if (!user) {
      setChecking(false)
      return
    }

    let cancelled = false

    async function checkVault() {
      try {
        const res = await fetch("/api/vault/meta/exists")

        if (res.status === 404) {
          // Vault does not exist
          if (!cancelled) {
            setNeedsSetup(true)
          }
        } else {
          // Vault exists
          if (!cancelled) {
            setNeedsSetup(false)
          }
        }
      } catch {
        // Fail closed: assume setup needed
        if (!cancelled) {
          setNeedsSetup(true)
        }
      } finally {
        if (!cancelled) {
          setChecking(false)
        }
      }
    }

    checkVault()

    return () => {
      cancelled = true
    }
  }, [user])

  if (checking) {
    // Optional: splash screen / loader
    return null
  }

  return (
    <>
      {children}

      {user && needsSetup && (
        <VaultSetupModal
          open
          userId={user.uid}
          onSetupComplete={() => setNeedsSetup(false)}
        />
      )}
    </>
  )
}
