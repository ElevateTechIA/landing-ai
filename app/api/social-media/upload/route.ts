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

const allowedTypes = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime",
];

let corsConfigured = false;
async function ensureCors(bucket: ReturnType<typeof getStorageBucket>) {
  if (corsConfigured) return;
  try {
    await bucket.setCorsConfiguration([
      {
        origin: ["https://landing-ai-alpha-five.vercel.app", "http://localhost:3000", "http://localhost:3001"],
        method: ["PUT", "GET"],
        responseHeader: ["Content-Type"],
        maxAgeSeconds: 3600,
      },
    ]);
    corsConfigured = true;
  } catch (err) {
    console.warn("CORS config warning (may already be set):", err);
    corsConfigured = true;
  }
}

// POST with JSON body: returns presigned upload + read URLs (no file data needed)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, contentType } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json({ error: "Missing fileName or contentType" }, { status: 400 });
    }

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const bucket = getStorageBucket();
    await ensureCors(bucket);
    const filePath = `social-media/${user.uid}/${Date.now()}-${fileName}`;
    const gcsFile = bucket.file(filePath);

    // Signed URL for uploading (PUT) - valid for 15 minutes
    const [uploadUrl] = await gcsFile.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType,
    });

    // Public URL (permanent, no expiry)
    const bucketName = bucket.name;
    const readUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;

    return NextResponse.json({ uploadUrl, readUrl, filePath });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}

// PATCH: Make uploaded file public (called after client finishes uploading)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filePath } = await request.json();

    if (!filePath || !filePath.startsWith(`social-media/${user.uid}/`)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    const bucket = getStorageBucket();
    const gcsFile = bucket.file(filePath);
    await gcsFile.makePublic();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Make public error:", error);
    return NextResponse.json({ error: "Failed to make file public" }, { status: 500 });
  }
}
