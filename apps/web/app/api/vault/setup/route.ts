import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebaseAdmin"

export async function POST(req: NextRequest) {
  try {
    // 1. Verify session cookie
    const sessionCookie = req.cookies.get("session")?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    )

    const uid = decoded.uid

    // 2. Read verifier from client
    const { verifier } = await req.json()

    if (!verifier?.encrypted || !verifier?.iv) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      )
    }

    // 3. Prevent re-initialization
    const metaRef = adminDb
      .collection("users")
      .doc(uid)
      .collection("vaultMeta")
      .doc("main")

    const existing = await metaRef.get()
    if (existing.exists) {
      return NextResponse.json(
        { error: "Vault already exists" },
        { status: 409 }
      )
    }

    // 4. Store verifier
    await metaRef.set({
      verifier,
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Vault setup error:", err)
    return NextResponse.json(
      { error: "Vault setup failed" },
      { status: 500 }
    )
  }
}
