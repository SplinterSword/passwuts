import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { requireAuth } from "@/lib/verify-admin-token"

export async function GET(req: NextRequest) {
  try {
    // 1. Verify session cookie
    const { uid } = await requireAuth(req)

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
