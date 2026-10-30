import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      return NextResponse.json(
        { success: false, error: "Webhook secret not configured" },
        { status: 503 }
      );
    }

    const signature = request.headers.get("x-cld-signature");
    const timestamp = request.headers.get("x-cld-timestamp");

    if (!signature || !timestamp) {
      return NextResponse.json(
        { success: false, error: "Missing webhook signature headers" },
        { status: 401 }
      );
    }

    // Reject replay requests older than 10 minutes
    const tsNumber = parseInt(timestamp, 10);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (isNaN(tsNumber) || Math.abs(nowSeconds - tsNumber) > 600) {
      return NextResponse.json(
        { success: false, error: "Expired webhook timestamp" },
        { status: 401 }
      );
    }

    const rawBody = await request.text();
    const expectedSignature = crypto
      .createHash("sha1")
      .update(rawBody + timestamp + apiSecret)
      .digest("hex");

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (
      sigBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);

    if (body.notification_type === "upload") {
      console.log(`[Cloudinary Webhook] File uploaded: ${body.public_id}`);
    } else if (body.notification_type === "delete") {
      console.log(`[Cloudinary Webhook] File deleted: ${body.public_id}`);
    }

    return NextResponse.json({ success: true, message: "Webhook verified" });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid webhook payload" },
      { status: 400 }
    );
  }
}
