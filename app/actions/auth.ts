"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/security/sanitize";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const data = Object.fromEntries(formData.entries());

  const email = ((data.email as string) || "").trim().toLowerCase();
  const password = data.password as string;
  const nextUrl = getSafeRedirectPath(data.nextUrl as string, "/home");

  const rate = checkRateLimit(`auth_login:${email || "anon"}`, 8, 60_000);
  if (!rate.allowed) {
    return {
      error: `Too many sign-in attempts. Please wait ${rate.retryAfterSeconds}s and try again.`,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Invalid email or password." };
  }

  revalidatePath("/", "layout");
  redirect(nextUrl);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const data = Object.fromEntries(formData.entries());

  const email = ((data.email as string) || "").trim().toLowerCase();
  const password = data.password as string;
  const fullName = ((data.fullName as string) || "").trim();
  const username = ((data.username as string) || "").trim();

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  const rate = checkRateLimit(`auth_signup:${email || "anon"}`, 5, 60_000);
  if (!rate.allowed) {
    return {
      error: `Too many sign-up attempts. Please wait ${rate.retryAfterSeconds}s.`,
    };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/auth/verify");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
