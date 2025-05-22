'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check URL parameters for verification status or errors
  useEffect(() => {
    const verified = searchParams.get('verified');
    const error = searchParams.get('error');

    if (verified === 'true') {
      toast.success('Email verified successfully! You can now log in.');
    }

    if (error) {
      switch (error) {
        case 'auth_error':
          toast.error('Authentication error. Please try again.');
          break;
        case 'no_session':
          toast.error('Session error. Please try logging in again.');
          break;
        case 'unexpected_error':
          toast.error('An unexpected error occurred. Please try again.');
          break;
        default:
          toast.error('Error during authentication. Please try again.');
      }
    }
  }, [searchParams]);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      console.log('Checking authentication status...');

      // If we already have user and session from context
      if (user && session) {
        console.log('User already authenticated in context, redirecting to dashboard');
        window.location.href = '/dashboard';
        return;
      }

      // Double-check with Supabase directly
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (existingSession) {
          console.log('Found existing session in Supabase, redirecting to dashboard');

          // Use window.location for a hard redirect
          window.location.href = '/dashboard';
        } else {
          console.log('No existing session found, staying on login page');
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
      }
    };

    // Run the auth check immediately
    checkAuth();

    // Also set up an interval to periodically check auth status
    // This helps catch cases where the auth state changes but the component doesn't re-render
    const authCheckInterval = setInterval(checkAuth, 2000);

    return () => {
      clearInterval(authCheckInterval);
    };
  }, [user, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Login page: Attempting to sign in with email:', email);

      // Use the signIn method from AuthContext
      await signIn(email, password);

      // Add a manual redirect as a fallback
      console.log('Login page: Sign in completed, checking if redirect is needed');

      // Add a small delay to allow the auth state to update
      setTimeout(() => {
        // Check if we're still on the login page after signIn completes
        if (window.location.pathname.includes('/login')) {
          console.log('Login page: Still on login page after signIn, forcing redirect to dashboard');
          window.location.href = '/dashboard';
        }
      }, 1500);
    } catch (error: any) {
      console.error('Login form error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials and try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);

      // Use the signInWithGoogle method from AuthContext
      await signInWithGoogle();

      // The AuthContext will handle the redirect and session management
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error(error.message || 'Google login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            {t('auth.login')}
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
          <div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                  {t('auth.email')}
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                  {t('auth.password')}
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                  />
                  <label htmlFor="remember-me" className="ml-3 block text-sm leading-6 text-gray-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm leading-6">
                  <Link href="/forgot-password" className="font-semibold text-primary-600 hover:text-primary-500">
                    {t('auth.forgot_password')}
                  </Link>
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  fullWidth
                  isLoading={isLoading}
                  className="font-semibold shadow-md"
                >
                  {t('auth.login')}
                </Button>
              </div>
            </form>

            <div>
              <div className="relative mt-10">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm font-medium leading-6">
                  <span className="bg-white px-6 text-gray-900">{t('auth.or_continue_with')}</span>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  fullWidth
                  variant="outline"
                  onClick={handleGoogleLogin}
                  isLoading={isLoading}
                  className="font-semibold shadow-sm border-gray-400"
                >
                  <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24">
                    <path
                      d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                      fill="#EA4335"
                    />
                    <path
                      d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                      fill="#34A853"
                    />
                  </svg>
                  {t('auth.google')}
                </Button>
              </div>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-gray-500">
            {t('auth.dont_have_account')}{' '}
            <Link href="/signup" className="font-semibold leading-6 text-primary-600 hover:text-primary-500">
              {t('auth.signup')}
            </Link>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
