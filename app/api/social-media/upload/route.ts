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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/quicktime",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const bucket = getStorageBucket();
    const filePath = `social-media/${user.uid}/${Date.now()}-${file.name}`;
    const gcsFile = bucket.file(filePath);

    const buffer = Buffer.from(await file.arrayBuffer());

    await gcsFile.save(buffer, {
      metadata: { contentType: file.type },
    });

    // Generate a signed read URL (valid for 7 days) so external services can access the file
    const [signedUrl] = await gcsFile.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return NextResponse.json({ publicUrl: signedUrl, filePath });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
