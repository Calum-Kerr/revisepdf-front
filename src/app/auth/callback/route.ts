import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type'); // Get the type parameter (signup, recovery, etc.)
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Error exchanging code for session:', error);
        // If there's an error, redirect to login page with error message
        const loginUrl = new URL('/login', appUrl);
        loginUrl.searchParams.set('error', 'auth_error');
        return NextResponse.redirect(loginUrl);
      }

      // Get the current session to verify authentication worked
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // If no session, redirect to login page
        const loginUrl = new URL('/login', appUrl);
        loginUrl.searchParams.set('error', 'no_session');
        return NextResponse.redirect(loginUrl);
      }

      // Determine the redirect URL based on the type of verification
      let redirectUrl;
      if (type === 'signup') {
        // For email verification after signup, redirect to login with success message
        redirectUrl = new URL('/login', appUrl);
        redirectUrl.searchParams.set('verified', 'true');
      } else if (type === 'recovery') {
        // For password recovery, redirect to reset password page
        redirectUrl = new URL('/reset-password', appUrl);
      } else {
        // For other types (like magic link), redirect to dashboard
        redirectUrl = new URL(next, appUrl);
      }

      // Set a cookie to persist the session
      const response = NextResponse.redirect(redirectUrl);

      // Set secure cookie flags for production
      response.cookies.set({
        name: 'supabase-auth-session',
        value: 'authenticated',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });

      // Set additional cookies to help with session persistence
      response.cookies.set({
        name: 'supabase-auth-token-expiry',
        value: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000).toISOString(), // 1 week from now
        httpOnly: false, // Allow JavaScript access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });

      // Set a verification status cookie for client-side detection
      response.cookies.set({
        name: 'auth-verification-status',
        value: type || 'unknown',
        httpOnly: false, // Allow JavaScript access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60, // Short-lived cookie (1 minute)
        path: '/',
      });

      return response;
    } catch (error) {
      console.error('Error in auth callback:', error);
      const loginUrl = new URL('/login', appUrl);
      loginUrl.searchParams.set('error', 'unexpected_error');
      return NextResponse.redirect(loginUrl);
    }
  }

  // If no code is present, redirect to home page
  return NextResponse.redirect(new URL('/', appUrl));
}
