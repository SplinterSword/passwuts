import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin"

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
