import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebaseAdmin"

export async function GET(req: NextRequest) {
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

    // 2. Fetch vault metadata
    const metaRef = adminDb
      .collection("users")
      .doc(uid)
      .collection("vaultMeta")
      .doc("main")

    const snap = await metaRef.get()

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Vault not initialized" },
        { status: 404 }
      )
    }

    return NextResponse.json(snap.data())
  } catch (err) {
    console.error("Vault meta error:", err)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
}
