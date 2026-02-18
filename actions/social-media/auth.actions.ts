"use server";

import { cookies } from "next/headers";
import { db, getAdminAuth } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

const SESSION_COOKIE_NAME = "sm_session";
const SESSION_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export async function createSessionCookie(idToken: string) {
  try {
    const auth = getAdminAuth();

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY_MS,
    });

    // Verify the token to get user info
    const decoded = await auth.verifyIdToken(idToken);

    // Create or update user document on first sign-in
    const userRef = db.collection("socialMediaUsers").doc(decoded.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        uid: decoded.uid,
        email: decoded.email ?? "",
        displayName: decoded.name ?? "",
        photoURL: decoded.picture ?? null,
        plan: "free",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        settings: {
          timezone: "UTC",
          defaultHashtags: [],
          notificationPrefs: {
            email: true,
            push: false,
          },
        },
      });
    } else {
      await userRef.update({
        displayName: decoded.name ?? userDoc.data()?.displayName,
        photoURL: decoded.picture ?? userDoc.data()?.photoURL,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_MS / 1000,
      path: "/",
    });

    return { success: true };
  } catch (error) {
    console.error("Session cookie creation failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "generic" as const };
  }
}

export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!session) return null;

    const auth = getAdminAuth();

    const decoded = await auth.verifySessionCookie(session, true);

    const userDoc = await db.collection("socialMediaUsers").doc(decoded.uid).get();
    if (!userDoc.exists) return null;

    const data = userDoc.data();
    return {
      uid: decoded.uid,
      email: data?.email ?? decoded.email ?? "",
      displayName: data?.displayName ?? "",
      photoURL: data?.photoURL ?? null,
      plan: data?.plan ?? "free",
      settings: data?.settings ?? {
        timezone: "UTC",
        defaultHashtags: [],
        notificationPrefs: { email: true, push: false },
      },
    };
  } catch {
    return null;
  }
}

export async function getUserSettings() {
  const user = await getSessionUser();
  if (!user) return null;
  return user.settings;
}

export async function updateUserSettings(settings: {
  timezone?: string;
  defaultHashtags?: string[];
}) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "unauthorized" as const };

  try {
    const userRef = db.collection("socialMediaUsers").doc(user.uid);
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (settings.timezone) {
      updates["settings.timezone"] = settings.timezone;
    }
    if (settings.defaultHashtags) {
      updates["settings.defaultHashtags"] = settings.defaultHashtags;
    }

    await userRef.update(updates);
    return { success: true };
  } catch (error) {
    console.error("Error updating settings:", error);
    return { success: false, error: "update_failed" as const };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return { success: true };
}
