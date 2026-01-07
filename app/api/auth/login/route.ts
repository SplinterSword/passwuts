import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'

const SESSION_EXPIRES_IN = 1000 * 60 * 60 * 24 * 7 // 7 days

export async function POST(req: Request) {
  const { idToken } = await req.json()

  // 1. Verify short-lived ID token
  await adminAuth.verifyIdToken(idToken)

  // 2. Create LONG-LIVED session cookie
  const sessionCookie = await adminAuth.createSessionCookie(
    idToken,
    { expiresIn: SESSION_EXPIRES_IN }
  )

  const res = NextResponse.json({ success: true })

  // 3. Store session cookie (NOT ID token)
  res.cookies.set('session', sessionCookie, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_EXPIRES_IN / 1000,
  })

  return res
}
