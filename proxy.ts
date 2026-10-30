import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DEFAULT_SUPER_ADMIN_EMAIL } from "@/lib/admin/auth";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  // Public routes that don't require authentication
  const isAuthRoute = url.pathname.startsWith("/auth");
  const isPublicRoute =
    url.pathname === "/" ||
    url.pathname.startsWith("/explore") ||
    url.pathname.startsWith("/share") ||
    url.pathname.startsWith("/about") ||
    url.pathname.startsWith("/map") ||
    url.pathname.startsWith("/places");
  const isAdminRoute = url.pathname.startsWith("/admin");
  const isAdminApiRoute =
    url.pathname.startsWith("/api/admin") ||
    url.pathname.startsWith("/admin/api");
  const isApiRoute = url.pathname.startsWith("/api");

  // Enforce authentication & admin role at the edge for Admin API routes
  if (isAdminApiRoute) {
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isOwnerEmail =
      DEFAULT_SUPER_ADMIN_EMAIL !== "" &&
      user.email?.toLowerCase().trim() === DEFAULT_SUPER_ADMIN_EMAIL;

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = userRole?.role;
    const isAuthorized =
      isOwnerEmail ||
      role === "ADMIN" ||
      role === "SUPER_ADMIN" ||
      role === "MODERATOR";

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    return supabaseResponse;
  }

  // Skip for non-admin API routes (which perform their own per-route auth checks)
  if (isApiRoute) {
    return supabaseResponse;
  }

  // Handle unauthenticated users trying to access protected routes
  if (!user && !isAuthRoute && !isPublicRoute && !isAdminRoute) {
    url.pathname = "/auth/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Handle authenticated users trying to access auth routes (like login)
  if (user && isAuthRoute && url.pathname !== "/auth/verify-email") {
    const isOwnerEmail =
      DEFAULT_SUPER_ADMIN_EMAIL !== "" &&
      user.email?.toLowerCase().trim() === DEFAULT_SUPER_ADMIN_EMAIL;
    if (isOwnerEmail) {
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  // Handle Admin routes
  const isAdminLogin =
    url.pathname === "/admin/mingle/login" ||
    url.pathname === "/admin/sorsovent/login";
  if (isAdminRoute && !user && !isAdminLogin) {
    url.pathname = "/admin/mingle/login";
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && user) {
    const isOwnerEmail =
      DEFAULT_SUPER_ADMIN_EMAIL !== "" &&
      user.email?.toLowerCase().trim() === DEFAULT_SUPER_ADMIN_EMAIL;

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = userRole?.role;
    const isAuthorized =
      isOwnerEmail ||
      role === "ADMIN" ||
      role === "SUPER_ADMIN" ||
      role === "MODERATOR";

    if (!isAuthorized && !isAdminLogin) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (isAuthorized && isAdminLogin) {
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
