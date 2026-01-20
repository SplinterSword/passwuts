import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebaseAdmin'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = (await cookies()).get('session')?.value
  if (session) {
    const decoded = await adminAuth.verifySessionCookie(session)
    await adminAuth.revokeRefreshTokens(decoded.sub)
  }

  const res = NextResponse.json({ success: true })
  res.cookies.delete('session')
  return res
}
