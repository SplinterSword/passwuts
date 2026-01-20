import { NextRequest } from "next/server"
import { adminAuth } from "@/lib/firebaseAdmin"

export async function requireAuth(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value

  if (!sessionCookie) {
    throw new Error("Unauthorized")
  }

  const decoded = await adminAuth.verifySessionCookie(
    sessionCookie,
    true // checkRevoked
  )

  return {
    uid: decoded.uid,
    decoded,
  }
}
