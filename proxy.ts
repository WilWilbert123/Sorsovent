import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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
  const isAuthRoute = url.pathname.startsWith('/auth');
  const isPublicRoute =
    url.pathname === '/' ||
    url.pathname.startsWith('/explore') ||
    url.pathname.startsWith('/share') ||
    url.pathname.startsWith('/about') ||
    url.pathname.startsWith('/map') ||
    url.pathname.startsWith('/places');
  const isAdminRoute = url.pathname.startsWith('/admin');
  const isApiRoute = url.pathname.startsWith('/api');

  // Skip for API routes
  if (isApiRoute) {
    return supabaseResponse;
  }

  // Handle unauthenticated users trying to access protected routes
  if (!user && !isAuthRoute && !isPublicRoute && !isAdminRoute) {
    url.pathname = '/auth/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Handle authenticated users trying to access auth routes (like login)
  if (user && isAuthRoute && url.pathname !== '/auth/verify-email') {
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  // Handle Admin routes
  if (isAdminRoute && !user && url.pathname !== '/admin/login') {
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && user) {
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const role = userRole?.role;
    const isAuthorizedAdmin =
      role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MODERATOR';

    if (!isAuthorizedAdmin && url.pathname !== '/admin/login') {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    if (isAuthorizedAdmin && url.pathname === '/admin/login') {
      url.pathname = '/admin/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
