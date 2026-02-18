import { db } from "@/lib/firebase";
import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";

const converter = <T extends DocumentData>() => ({
  toFirestore: (data: T) => data,
  fromFirestore: (snap: QueryDocumentSnapshot) => ({
    id: snap.id,
    ...snap.data(),
  }) as T & { id: string },
});

export const socialCollections = {
  users: () => db.collection("socialMediaUsers").withConverter(converter<UserDoc>()),
  socialAccounts: () =>
    db.collection("socialAccounts").withConverter(converter<SocialAccountDoc>()),
  posts: () => db.collection("socialPosts").withConverter(converter<PostDoc>()),
  scheduledJobs: () =>
    db.collection("scheduledJobs").withConverter(converter<ScheduledJobDoc>()),
  publishLogs: (postId: string) =>
    db
      .collection("socialPosts")
      .doc(postId)
      .collection("publishLogs")
      .withConverter(converter<PublishLogDoc>()),
};

// Document types
export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  plan: "free" | "pro" | "enterprise";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  settings: {
    timezone: string;
    defaultHashtags: string[];
    notificationPrefs: {
      email: boolean;
      push: boolean;
    };
  };
}

export interface SocialAccountDoc {
  userId: string;
  platform: "facebook" | "instagram" | "tiktok" | "youtube" | "whatsapp";
  platformAccountId: string;
  platformAccountName: string;
  platformAccountAvatar: string | null;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  tokenIV: string;
  tokenAuthTag: string;
  refreshTokenIV?: string | null;
  refreshTokenAuthTag?: string | null;
  tokenExpiresAt: FirebaseFirestore.Timestamp | null;
  tokenRefreshedAt: FirebaseFirestore.Timestamp;
  scopes: string[];
  metadata: Record<string, unknown>;
  status: "active" | "expired" | "revoked" | "error";
  lastError: string | null;
  connectedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface PostDoc {
  userId: string;
  content: {
    text: string;
    hashtags: string[];
    mediaUrls: string[];
    mediaTypes: ("image" | "video")[];
    thumbnailUrl: string | null;
  };
  targetPlatforms: string[];
  targetAccountIds: string[];
  status: "draft" | "scheduled" | "publishing" | "completed" | "partial" | "failed";
  scheduledAt: FirebaseFirestore.Timestamp | null;
  publishedAt: FirebaseFirestore.Timestamp | null;
  platformOverrides: Record<
    string,
    {
      text?: string;
      title?: string;
      description?: string;
      privacy?: string;
      templateName?: string;
    }
  >;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface PublishLogDoc {
  platform: string;
  accountId: string;
  status: "pending" | "publishing" | "published" | "failed";
  platformPostId: string | null;
  platformPostUrl: string | null;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    rawResponse: string | null;
  } | null;
  attempts: number;
  lastAttemptAt: FirebaseFirestore.Timestamp;
  publishedAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface ScheduledJobDoc {
  postId: string;
  userId: string;
  scheduledAt: FirebaseFirestore.Timestamp;
  status: "pending" | "processing" | "completed" | "failed";
  qstashMessageId: string | null;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: FirebaseFirestore.Timestamp | null;
  error: string | null;
  createdAt: FirebaseFirestore.Timestamp;
}
