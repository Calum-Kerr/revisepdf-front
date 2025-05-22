import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Error exchanging code for session:', error);
        // If there's an error, redirect to login page
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Get the current session to verify authentication worked
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // If no session, redirect to login page
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // URL to redirect to after sign in process completes
      return NextResponse.redirect(new URL(next, process.env.NEXT_PUBLIC_APP_URL || request.url));
    } catch (error) {
      console.error('Error in auth callback:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // If no code is present, redirect to home page
  return NextResponse.redirect(new URL('/', request.url));
}
