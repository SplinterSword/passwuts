'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s : any) => s.setUser)

  useEffect(() => {
    fetch('/api/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => setUser(data?.user ?? null))
  }, [])

  return children
}
