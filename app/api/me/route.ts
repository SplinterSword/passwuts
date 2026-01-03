// app/api/me/route.ts
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebaseAdmin'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = (await cookies()).get('session')?.value
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const user = await adminAuth.verifyIdToken(session)
  return NextResponse.json({ user })
}
