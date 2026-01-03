import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'

export async function POST(req: Request) {
  const { idToken } = await req.json()

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken)

    const response = NextResponse.json({ success: true })
    
    response.cookies.set('session', idToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
