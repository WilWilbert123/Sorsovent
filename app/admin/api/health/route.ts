import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Quick query to check DB connection
    const { error } = await supabase.from("user_roles").select("id").limit(1);
    
    if (error) throw error;
    
    return NextResponse.json(
      { 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }, 
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: "unhealthy", 
        error: error.message,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}
