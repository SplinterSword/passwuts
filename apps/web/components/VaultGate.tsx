"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { useVaultStore } from "@/store/vaultStore"
import { VaultSetupModal } from "@/components/vault-setup-modal"
import { VaultUnlockModal } from "@/components/vault-unlock-modal"

type VaultState = "checking" | "needs-setup" | "locked" | "unlocked"

export function VaultGate({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  const { isUnlocked } = useVaultStore()

  const [vaultState, setVaultState] = useState<VaultState>("checking")

  useEffect(() => {
    if (!user) {
      setVaultState("checking")
      return
    }

    let cancelled = false

    async function determineVaultState() {
      try {
        const res = await fetch("/api/vault/meta/exists")

        if (cancelled) return

        if (res.status === 404) {
          setVaultState("needs-setup")
          return
        }

        // Vault exists
        if (isUnlocked) {
          setVaultState("unlocked")
        } else {
          setVaultState("locked")
        }
      } catch {
        // Fail closed: force setup
        if (!cancelled) {
          setVaultState("needs-setup")
        }
      }
    }

    determineVaultState()

    return () => {
      cancelled = true
    }
  }, [user, isUnlocked])

  // AuthGate should handle unauthenticated users
  if (!user) {
    return null
  }

  if (vaultState === "checking") {
    // Optional: splash / loader
    return null
  }

  return (
    <>
      {/* Always render app UI */}
      {children}

      {/* Vault setup has highest priority */}
      {vaultState === "needs-setup" && (
        <VaultSetupModal
          open
          userId={user.uid}
          onSetupComplete={() => setVaultState("locked")}
        />
      )}

      {/* Unlock only if vault exists */}
      {vaultState === "locked" && (
        <VaultUnlockModal
          open
          userId={user.uid}
          onUnlockComplete={() => setVaultState("unlocked")}
        />
      )}
    </>
  )
}
