import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  const pathname = request.nextUrl.pathname

  // Protect routes
  if (pathname.startsWith('/accounts')) {
    if (!session) {
      return NextResponse.redirect(
        new URL('/login', request.url)
      )
    }
  }

  return NextResponse.next()
}


export const config = {
  matcher: ['/accounts/:path*']
}
