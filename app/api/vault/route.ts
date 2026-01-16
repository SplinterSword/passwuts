import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin"
import type { VaultItemFromAPI } from "@/types/vault"

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true // checkRevoked
    );

    const uid = decodedClaims.uid;

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
    const sessionCookie = req.cookies.get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true // checkRevoked
    )

    const uid = decodedClaims.uid

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
