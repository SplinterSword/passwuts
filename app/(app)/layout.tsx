"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { VaultSetupGate } from "@/components/VaultSetupGate"
import { VaultGate } from "@/components/VaultGate"
import { useAuthStore } from "@/store/authStore"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const router = useRouter()

  // 🔐 Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [user, loading, router])

  if (loading || !user) {
    return null // or a loading spinner
  }

  return (
    <VaultSetupGate>
      <VaultGate>
        {children}
      </VaultGate>
    </VaultSetupGate>
  )
}
