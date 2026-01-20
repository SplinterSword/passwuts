import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { requireAuth } from "@/lib/verify-admin-token"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Authenticate
    const { uid } = await requireAuth(req)

    // ✅ Await params
    const { id: vaultItemId } = await params

    if (!vaultItemId) {
      return NextResponse.json(
        { error: "Missing vault item id" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { isFavorite } = body as { isFavorite: boolean }

    if (typeof isFavorite !== "boolean") {
      return NextResponse.json(
        { error: "Invalid isFavorite value" },
        { status: 400 }
      )
    }

    const ref = adminDb
      .collection("users")
      .doc(uid)
      .collection("vault")
      .doc(vaultItemId)

    await ref.update({
      isFavorite,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Favorite PATCH error:", err)

    return NextResponse.json(
      { error: "Unauthorized or failed to update favorite" },
      { status: 401 }
    )
  }
}
