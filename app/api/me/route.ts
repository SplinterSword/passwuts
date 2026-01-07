import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebaseAdmin'
import { NextResponse } from 'next/server'

export async function GET() {
  const sessionCookie = (await cookies()).get('session')?.value
  if (!sessionCookie) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const decoded = await adminAuth.verifySessionCookie(
    sessionCookie,
    true // checkRevoked
  )

  return NextResponse.json({ user: decoded })
}
