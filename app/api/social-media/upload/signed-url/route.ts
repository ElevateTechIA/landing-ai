import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getStorageBucket } from "@/lib/firebase";
import { cookies } from "next/headers";

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("sm_session")?.value;
  if (!session) return null;

  try {
    const auth = getAdminAuth();
    return await auth.verifySessionCookie(session, true);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, contentType, fileSize } = body;

    const allowedTypes = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/quicktime",
    ];

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const maxSize = contentType.startsWith("video/") ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const bucket = getStorageBucket();
    const filePath = `social-media/${user.uid}/${Date.now()}-${fileName}`;
    const file = bucket.file(filePath);

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType,
    });

    return NextResponse.json({
      uploadUrl: signedUrl,
      storagePath: filePath,
      publicUrl: `https://storage.googleapis.com/${bucket.name}/${filePath}`,
    });
  } catch (error) {
    console.error("Signed URL error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
