import { Client } from "@upstash/qstash";

let qstashClient: Client | null = null;

export function getQStashClient(): Client {
  if (!qstashClient) {
    qstashClient = new Client({
      token: process.env.UPSTASH_QSTASH_TOKEN!,
    });
  }
  return qstashClient;
}

export async function schedulePost(
  postId: string,
  scheduledAt: Date,
  platforms: string[]
): Promise<string[]> {
  const client = getQStashClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL environment variable is required for scheduling");
  }
  const messageIds: string[] = [];

  for (const platform of platforms) {
    const result = await client.publishJSON({
      url: `${baseUrl}/api/social-media/webhooks/qstash`,
      body: {
        type: "publish_post",
        postId,
        platform,
      },
      notBefore: Math.floor(scheduledAt.getTime() / 1000),
    });

    if ("messageId" in result) {
      messageIds.push(result.messageId);
    }
  }

  return messageIds;
}
