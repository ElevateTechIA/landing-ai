"use server";

import { getSessionUser } from "./auth.actions";
import { getStorageBucket } from "@/lib/firebase";

export async function getSignedUploadUrl(
  fileName: string,
  contentType: string
) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "unauthorized" as const };

  try {
    const bucket = getStorageBucket();
    const filePath = `social-media/${user.uid}/${Date.now()}-${fileName}`;
    const file = bucket.file(filePath);

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    return {
      success: true,
      signedUrl,
      publicUrl,
      filePath,
    };
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return { success: false, error: "upload_failed" as const };
  }
}

export async function deleteMedia(filePath: string) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "unauthorized" as const };

  // Verify the file belongs to this user
  if (!filePath.startsWith(`social-media/${user.uid}/`)) {
    return { success: false, error: "unauthorized" as const };
  }

  try {
    const bucket = getStorageBucket();
    await bucket.file(filePath).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting media:", error);
    return { success: false, error: "delete_failed" as const };
  }
}
