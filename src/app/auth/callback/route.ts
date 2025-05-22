import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
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
        // If there's an error, redirect to login page
        return NextResponse.redirect(new URL('/login', appUrl));
      }

      // Get the current session to verify authentication worked
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // If no session, redirect to login page
        return NextResponse.redirect(new URL('/login', appUrl));
      }

      // Set a cookie to persist the session
      const response = NextResponse.redirect(new URL(next, appUrl));

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

      return response;
    } catch (error) {
      console.error('Error in auth callback:', error);
      return NextResponse.redirect(new URL('/login', appUrl));
    }
  }

  // If no code is present, redirect to home page
  return NextResponse.redirect(new URL('/', appUrl));
}
