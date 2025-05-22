import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/tools/compress', '/tools/merge', '/tools/split', '/tools/convert'];

// Routes that should redirect to dashboard if authenticated
const authRoutes = ['/login', '/signup', '/forgot-password'];

// Public routes that should be accessible without authentication
const publicRoutes = ['/', '/pricing', '/tools', '/terms', '/privacy', '/about', '/forgot-password'];

// Skip middleware for static files and API routes
const publicPaths = [
  '/locales',
  '/_next',
  '/favicon.ico',
  '/api',
  '/images',
  '/fonts',
];

export async function middleware(req: NextRequest) {
  // Skip middleware for static files and API routes
  const { pathname } = req.nextUrl;

  // Check if the path should be skipped
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Create a response object that we'll modify based on auth status
  const res = NextResponse.next();

  try {
    // Create the Supabase client
    const supabase = createMiddlewareClient({ req, res });

    // Check if the user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Log authentication status for debugging (only for non-static paths)
    console.log(`Middleware: Path ${pathname}, Authenticated: ${!!session}`);

    // PRIORITY 1: If the user is authenticated and trying to access auth routes, redirect to dashboard
    if (session && authRoutes.some(route => pathname === route)) {
      console.log(`Middleware: Authenticated user accessing ${pathname}, redirecting to dashboard`);
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Check if the current path is a public route
    if (publicRoutes.some(route => pathname === route)) {
      console.log(`Middleware: Public route ${pathname}, allowing access`);
      return res;
    }

    // PRIORITY 2: If the route is protected and the user is not authenticated, redirect to login
    if (protectedRoutes.some(route => pathname.startsWith(route)) && !session) {
      console.log(`Middleware: Unauthenticated user accessing ${pathname}, redirecting to login`);
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // For all other routes, proceed normally with the enhanced response
    // that includes the Supabase auth cookies
    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    // In case of error, still allow the request to proceed
    // but log the error for debugging
    return res;
  }
}

export const config = {
  matcher: [
    // Skip static files
    '/((?!_next/static|_next/image|favicon.ico|locales).*)',
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
