import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // In a production application, verify the webhook signature here
    // using cloudinary.utils.verifyNotificationSignature()

    if (body.notification_type === "upload") {
      // Process successful upload (e.g. tag it, move it, or log it)
      console.log(`File uploaded: ${body.public_id}`);
    } else if (body.notification_type === "delete") {
      console.log(`File deleted: ${body.public_id}`);
    }

    return NextResponse.json({ success: true, message: "Webhook received" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid webhook payload" }, { status: 400 });
  }
}
