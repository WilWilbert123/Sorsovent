import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // In a real application, you would parse the formData and upload to Cloudinary/S3 here
    // For now, since we use client-side signed uploads to Cloudinary, 
    // this endpoint serves as a fallback or proxy if needed.
    
    return NextResponse.json({ 
      success: false, 
      error: "Direct server uploads are disabled. Use the Cloudinary signature API." 
    }, { status: 405 });
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
