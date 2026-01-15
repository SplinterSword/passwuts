"use client"

import { useEffect, useState } from "react"
import { useVaultStore } from "@/store/vaultStore"
import { VaultUnlockModal } from "@/components/vault-unlock-modal"
import { useAuthStore } from "@/store/authStore"

export function VaultGate({
  children,
}: {
  children: React.ReactNode
}) {
  const { isUnlocked } = useVaultStore()
  const user = useAuthStore((s) => s.user)

  const [showUnlock, setShowUnlock] = useState(false)

  useEffect(() => {
    if (user && !isUnlocked) {
      setShowUnlock(true)
    } else {
      setShowUnlock(false)
    }
  }, [user, isUnlocked])

  if (!user) {
    // AuthGate should handle this, but just in case
    return null
  }

  return (
    <>
      {children}
      <VaultUnlockModal
        open={showUnlock}
        userId={user.uid}
        onUnlockComplete={() => setShowUnlock(false)}
      />
    </>
  )
}
