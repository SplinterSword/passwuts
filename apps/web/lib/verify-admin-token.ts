import { NextRequest } from "next/server"
import { adminAuth } from "@/lib/firebaseAdmin"

export async function requireAuth(req: NextRequest) {
  // 1️⃣ Try Authorization header (extension, mobile, etc.)
  const authHeader = req.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.slice("Bearer ".length)

    try {
      const decoded = await adminAuth.verifyIdToken(idToken)

      return {
        uid: decoded.uid,
        decoded,
        authType: "bearer",
      }
    } catch {
      throw new Error("Invalid bearer token")
    }
  }

  // 2️⃣ Fallback to session cookie (web app)
  const sessionCookie = req.cookies.get("session")?.value

  if (!sessionCookie) {
    throw new Error("Unauthorized")
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(
      sessionCookie,
      true // checkRevoked
    )

    return {
      uid: decoded.uid,
      decoded,
      authType: "session",
    }
  } catch {
    throw new Error("Invalid session cookie")
  }
}
