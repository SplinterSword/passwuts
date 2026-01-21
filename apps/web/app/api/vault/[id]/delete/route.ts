import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { requireAuth } from "@/lib/verify-admin-token"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid } = await requireAuth(req)

    const { id: vaultItemId } = await params

    if (!vaultItemId) {
      return NextResponse.json(
        { error: "Missing vault item id" },
        { status: 400 }
      )
    }

    const ref = adminDb
      .collection("users")
      .doc(uid)
      .collection("vault")
      .doc(vaultItemId)

    // 🔍 Ensure item exists (optional but safer)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Vault item not found" },
        { status: 404 }
      )
    }

    await ref.delete()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Vault DELETE error:", err)

    return NextResponse.json(
      { error: "Unauthorized or failed to delete vault item" },
      { status: 401 }
    )
  }
}
