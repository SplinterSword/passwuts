'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

export function ClientGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user])

  if (loading) return null
  return children
}
