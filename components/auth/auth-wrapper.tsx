"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    const supabase = createClient();
    
    // Quick mount check for any global auth initialization logic needed client-side
    supabase.auth.getSession().then(() => {
      setIsReady(true);
    });
  }, []);

  if (!isReady) return null; // Or a very subtle loader

  return <>{children}</>;
}
