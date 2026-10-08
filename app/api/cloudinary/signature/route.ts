import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { folder } = body;

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const timestamp = Math.round(new Date().getTime() / 1000);

    return NextResponse.json({ 
      timestamp, 
      signature: apiSecret ? "signed_active" : "unsigned_mode", 
      folder 
    });
    
    return NextResponse.json({ 
      timestamp, 
      signature: "placeholder_signature", 
      folder 
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
