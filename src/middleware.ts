import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/tools/compress', '/tools/merge', '/tools/split', '/tools/convert'];

// Routes that should redirect to dashboard if authenticated
const authRoutes = ['/login', '/signup', '/forgot-password'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Check if the user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Get the pathname from the URL
  const { pathname } = req.nextUrl;

  // Log authentication status for debugging
  console.log(`Middleware: Path ${pathname}, Authenticated: ${!!session}`);

  // Check if the route is protected and the user is not authenticated
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !session) {
    console.log(`Middleware: Redirecting to login from ${pathname}`);
    // Redirect to login page
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If the user is authenticated and trying to access login or signup pages, redirect to dashboard
  if (session && authRoutes.some(route => pathname === route)) {
    console.log(`Middleware: Redirecting to dashboard from ${pathname}`);
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // For all other routes, proceed normally
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
