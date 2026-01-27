"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { VaultGate } from "@/components/VaultGate"
import { useAuthStore } from "@/store/authStore"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useAuthStore((s : any) => s.user)
  const loading = useAuthStore((s : any) => s.loading)
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
    <VaultGate>
      {children}
    </VaultGate>
  )
}
