import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin"
import { requireAuth } from "@/lib/verify-admin-token"
import type { VaultItemFromAPI } from "@/types/vault"

export async function POST(req: NextRequest) {
  try {
    // 1. Verify session cookie
    const { uid } = await requireAuth(req)

    const body = await req.json();

    await adminDb
      .collection("users")
      .doc(uid)
      .collection("vault")
      .add({
        ...body,
        createdAt: new Date(),
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Vault POST error:", err);

    return NextResponse.json(
      { error: "Unauthorized or invalid session" },
      { status: 401 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Verify session cookie
    const { uid } = await requireAuth(req)

    const snapshot = await adminDb
      .collection("users")
      .doc(uid)
      .collection("vault")
      .orderBy("createdAt", "desc")
      .get()

    const items: VaultItemFromAPI[] = snapshot.docs.map((doc) => {
      const data = doc.data()

      return {
        id: doc.id,
        name: data.name,
        url: data.url,
        username: data.username,
        email: data.email,
        encryptedPassword: data.encryptedPassword,
        iv: data.iv,
        hasWarning: data.hasWarning,
        isFavorite: data.isFavorite,
        createdAt: data.createdAt?.toDate()?.toISOString(),
        updatedAt: data.updatedAt?.toDate()?.toISOString(),
      }
    })

    return NextResponse.json(items)
  } catch (err) {
    console.error("Vault GET error:", err)

    return NextResponse.json(
      { error: "Unauthorized or failed to fetch vault" },
      { status: 401 }
    )
  }
}
