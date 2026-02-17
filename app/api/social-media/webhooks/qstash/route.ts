import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";

const receiver = new Receiver({
  currentSigningKey: process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.UPSTASH_QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("upstash-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const isValid = await receiver.verify({
      body: rawBody,
      signature,
    }).catch(() => false);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { postId, platform, accountId } = body;

    if (!postId || !platform || !accountId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // TODO: Implement publishing logic:
    // 1. Load post from Firestore
    // 2. Load and decrypt social account tokens
    // 3. Get platform adapter
    // 4. Validate payload
    // 5. Check rate limits
    // 6. Publish to platform
    // 7. Write publish log
    // 8. Check if all platform publish logs are complete
    // 9. Update post status (completed/partial/failed)

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("QStash webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
