'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { resetPassword } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      setIsLoading(true);

      // Call the resetPassword function from the Supabase client
      const { error } = await resetPassword(email);

      if (error) {
        console.error('Error sending password reset email:', error);
        toast.error(error.message || 'Failed to send password reset email. Please try again.');
        return;
      }

      // Show success message and update UI
      toast.success('Password reset email sent. Please check your inbox.');
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Unexpected error during password reset:', error);
      toast.error(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            {isSubmitted ? 'Check Your Email' : 'Reset Your Password'}
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
          <div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12">
            {isSubmitted ? (
              <div className="text-center">
                <p className="text-base text-gray-600">
                  I've sent a password reset link to <strong>{email}</strong>. Please check your email and follow the instructions to reset your password.
                </p>
                <p className="mt-4 text-sm text-gray-500">
                  If you don't see the email in your inbox, please check your spam folder.
                </p>
                <div className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    onClick={() => setIsSubmitted(false)}
                  >
                    Try again with a different email
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                    Email address
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
                  <Button
                    type="submit"
                    fullWidth
                    isLoading={isLoading}
                    className="font-semibold shadow-md"
                  >
                    Send Reset Link
                  </Button>
                </div>

                <p className="mt-4 text-sm text-gray-500">
                  We'll send you an email with a link to reset your password. If you don't receive the email within a few minutes, please check your spam folder.
                </p>
              </form>
            )}
          </div>

          <p className="mt-10 text-center text-sm text-gray-500">
            Remember your password?{' '}
            <Link href="/login" className="font-semibold leading-6 text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
