'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import {
  UserCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { supabase, getUserStats } from '@/lib/supabase/client';

interface UserProfile {
  name: string;
  email: string;
  plan: string;
  usedStorage: number; // MB
  totalStorage: number; // MB
  dailyFilesUsed: number;
  dailyFilesLimit: number;
  monthlyFilesUsed: number;
  monthlyFilesLimit: number;
  maxBatchSize: number;
  daysUntilRenewal: number;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, profile, session, isLoading } = useAuth();
  const router = useRouter();

  // State management
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    email: '',
    plan: 'Free',
    usedStorage: 0,
    totalStorage: 10, // 10MB for free tier
    dailyFilesUsed: 0,
    dailyFilesLimit: 5,
    monthlyFilesUsed: 0,
    monthlyFilesLimit: 0, // Free tier uses daily limits
    maxBatchSize: 1,
    daysUntilRenewal: 0,
  });
  const [loadingState, setLoadingState] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Function to fetch user profile
  const fetchUserProfile = async () => {
    try {
      setLoadingState('loading');
      console.log('Fetching user profile...');

      // Get the current session directly from Supabase
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!currentSession) {
        console.error('No active session found in fetchUserProfile');
        setLoadingState('error');
        setErrorMessage('No active session found. Please log in again.');
        return;
      }

      console.log('Session found:', currentSession.user.id);

      // Get the current user from the session if not available in context
      const currentUser = user || currentSession.user;

      if (!currentUser) {
        console.error('No user information available');
        setLoadingState('error');
        setErrorMessage('User information not available. Please log in again.');
        return;
      }

      console.log('User found:', currentUser.email);

      // Update user profile with available information
      const updatedProfile = {
        ...userProfile,
        name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
        email: currentUser.email || 'No email available',
      };

      // Try to fetch the user's stats from Supabase
      try {
        console.log('Fetching user stats for user ID:', currentUser.id);
        const userStats = await getUserStats(currentUser.id);

        if (userStats) {
          console.log('User stats fetched successfully:', userStats);

          // Update the profile with the stats
          updatedProfile.plan = userStats.subscription_tier.charAt(0).toUpperCase() +
                               userStats.subscription_tier.slice(1);

          // Convert bytes to MB for display
          const totalProcessedMB = userStats.total_processed_bytes / (1024 * 1024);
          updatedProfile.usedStorage = totalProcessedMB;
          updatedProfile.totalStorage = userStats.max_file_size_mb;

          // Set the usage limits
          updatedProfile.dailyFilesUsed = userStats.daily_files_used;
          updatedProfile.dailyFilesLimit = userStats.daily_files_limit;
          updatedProfile.monthlyFilesUsed = userStats.monthly_files_used;
          updatedProfile.monthlyFilesLimit = userStats.monthly_files_limit;
          updatedProfile.maxBatchSize = userStats.max_batch_size;
          updatedProfile.daysUntilRenewal = userStats.days_until_renewal;
        } else {
          console.log('No user stats found, trying to use profile from context');

          // If we can't fetch the stats, use the profile from context if available
          if (profile) {
            console.log('Using profile from context instead');
            updatedProfile.plan = profile.subscription_tier?.charAt(0).toUpperCase() +
                                profile.subscription_tier?.slice(1) || 'Free';

            // For backward compatibility with old profile format
            if (profile.usage !== undefined && profile.file_size_limit !== undefined) {
              updatedProfile.usedStorage = profile.usage ? profile.usage / (1024 * 1024) : 0;
              updatedProfile.totalStorage = profile.file_size_limit ?
                                         profile.file_size_limit / (1024 * 1024) : 10;
            } else if (profile.max_file_size_mb !== undefined) {
              // New profile format
              updatedProfile.totalStorage = profile.max_file_size_mb;
              updatedProfile.dailyFilesUsed = profile.daily_files_used || 0;
              updatedProfile.dailyFilesLimit = profile.daily_files_limit || 5;
              updatedProfile.monthlyFilesUsed = profile.monthly_files_used || 0;
              updatedProfile.monthlyFilesLimit = profile.monthly_files_limit || 0;
              updatedProfile.maxBatchSize = profile.max_batch_size || 1;
            }
          }
        }
      } catch (profileError) {
        console.error('Exception fetching user stats:', profileError);
        // Continue with default values if stats fetch fails
      }

      console.log('Setting user profile and success state');
      setUserProfile(updatedProfile);
      setLoadingState('success');
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      setLoadingState('error');
      setErrorMessage(error.message || 'Failed to load user profile. Please try again.');
    }
  };

  // Check authentication and load user data
  useEffect(() => {
    console.log('Profile useEffect triggered, isLoading:', isLoading);

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loadingState === 'loading') {
        console.log('Loading timeout reached, forcing data fetch');
        checkAndLoadData();
      }
    }, 3000); // 3 seconds timeout

    const checkAndLoadData = async () => {
      try {
        console.log('Checking authentication status...');

        // Direct check with Supabase to ensure we have a valid session
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();

        if (supabaseSession) {
          console.log('Valid session found directly from Supabase:', supabaseSession.user.id);

          // Always try to refresh the session to ensure it's valid
          try {
            const { data } = await supabase.auth.refreshSession();
            console.log('Session refresh attempt result:', !!data.session);

            if (data.session) {
              console.log('Session refreshed successfully, proceeding to fetch user profile');
              // Proceed with loading user data with a small delay to ensure state updates
              setTimeout(() => {
                fetchUserProfile();
              }, 100);
            } else {
              console.log('Session refresh failed, using existing session');
              // Still try to fetch user data with the existing session
              fetchUserProfile();
            }
          } catch (refreshError) {
            console.error('Error refreshing session:', refreshError);
            // Still try to fetch user data with the existing session
            fetchUserProfile();
          }
        } else {
          console.log('No valid session found, redirecting to login');
          // Force a hard redirect to login to avoid middleware issues
          window.location.href = '/login?redirect=/profile';
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setLoadingState('error');
        setErrorMessage('Authentication error. Please try logging in again.');
      }
    };

    // If not loading auth state, check and load data
    if (!isLoading) {
      checkAndLoadData();
    } else {
      console.log('Auth context still loading, waiting...');
    }

    // Clean up timeout
    return () => clearTimeout(loadingTimeout);
  }, [isLoading, loadingState, fetchUserProfile]);

  // Loading state with timeout
  const [showFallbackProfile, setShowFallbackProfile] = useState(false);

  // Set a timeout to show fallback profile if loading takes too long
  useEffect(() => {
    let fallbackTimer: NodeJS.Timeout;

    if (loadingState === 'loading') {
      fallbackTimer = setTimeout(() => {
        console.log('Loading timeout reached, showing fallback profile');
        setShowFallbackProfile(true);
      }, 5000); // 5 seconds timeout
    }

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [loadingState]);

  // Show loading state unless fallback is triggered
  if (loadingState === 'loading' && !showFallbackProfile) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-primary-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Loading your profile...</h3>
            <p className="mt-1 text-sm text-gray-500">Please wait while we fetch your information.</p>
            <button
              onClick={() => setShowFallbackProfile(true)}
              className="mt-4 text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Show profile anyway
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (loadingState === 'error') {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Profile</h3>
            <p className="mt-1 text-sm text-gray-500">{errorMessage || 'An unexpected error occurred.'}</p>
            <div className="mt-6">
              <Button
                onClick={fetchUserProfile}
                variant="outline"
                leftIcon={<ArrowPathIcon className="h-5 w-5" />}
              >
                Try Again
              </Button>
              <Button
                onClick={() => router.push('/login?redirect=/profile')}
                variant="primary"
                className="ml-4"
              >
                Back to Login
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Success state - render profile
  return (
    <MainLayout>
      <div className="bg-white py-12">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your account information and subscription
            </p>
          </div>

          <div className="space-y-6">
            {/* User Information */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900">Account Information</h2>

              <div className="mt-4 flex items-center">
                <UserCircleIcon className="h-16 w-16 text-gray-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-lg font-medium text-gray-900">{userProfile.name}</p>

                  <p className="mt-2 text-sm font-medium text-gray-500">Email</p>
                  <p className="text-lg font-medium text-gray-900">{userProfile.email}</p>
                </div>
              </div>
            </div>

            {/* Subscription Information */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Subscription</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/pricing')}
                >
                  Change Plan
                </Button>
              </div>

              <div className="mt-4">
                <div className="flex items-center">
                  <CreditCardIcon className="h-8 w-8 text-primary-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Current Plan</p>
                    <p className="text-lg font-medium text-gray-900">{userProfile.plan}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {/* File Size Limit */}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Maximum File Size</p>
                    <p className="text-lg font-medium text-gray-900">
                      {userProfile.totalStorage}MB
                    </p>
                  </div>

                  {/* Daily Files (Free Tier) */}
                  {userProfile.plan === 'Free' && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Daily Files Usage</p>
                      <p className="text-lg font-medium text-gray-900">
                        {userProfile.dailyFilesUsed} / {userProfile.dailyFilesLimit} files
                      </p>

                      <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-primary-500"
                          style={{ width: `${Math.min((userProfile.dailyFilesUsed / userProfile.dailyFilesLimit) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Monthly Files (Subscription Tiers) */}
                  {(userProfile.plan === 'Personal' || userProfile.plan === 'Power User' || userProfile.plan === 'Heavy User') && userProfile.monthlyFilesLimit > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Monthly Files Usage</p>
                      <p className="text-lg font-medium text-gray-900">
                        {userProfile.monthlyFilesUsed} / {userProfile.monthlyFilesLimit} files
                      </p>

                      <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-primary-500"
                          style={{ width: `${Math.min((userProfile.monthlyFilesUsed / userProfile.monthlyFilesLimit) * 100, 100)}%` }}
                        ></div>
                      </div>

                      {userProfile.daysUntilRenewal > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          Renews in {userProfile.daysUntilRenewal} days
                        </p>
                      )}
                    </div>
                  )}

                  {/* Pay-Per-Use Info */}
                  {userProfile.plan === 'Pay-Per-Use' && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Pay-Per-Use Pricing</p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-gray-600">
                        <li>$0.10 per 10MB increment (25MB file = $0.30)</li>
                        <li>$0.05 per additional file in a batch</li>
                        <li>No monthly commitment</li>
                      </ul>
                    </div>
                  )}

                  {/* Unlimited Info */}
                  {userProfile.plan === 'Unlimited Personal' && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Unlimited Usage</p>
                      <p className="text-sm text-gray-600">
                        Your plan includes unlimited file processing with no restrictions.
                      </p>
                    </div>
                  )}

                  {/* Batch Processing */}
                  {userProfile.maxBatchSize > 1 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Batch Processing</p>
                      <p className="text-sm text-gray-600">
                        Process up to {userProfile.maxBatchSize} files at once
                      </p>
                    </div>
                  )}

                  {/* Total Processed */}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Processed</p>
                    <p className="text-lg font-medium text-gray-900">
                      {userProfile.usedStorage.toFixed(1)}MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                Back to Dashboard
              </Button>
              <Button
                variant="primary"
                onClick={() => router.push('/pricing')}
              >
                Upgrade Plan
              </Button>
            </div>

            {/* Privacy Note */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                RevisePDF does not store your files. All processing is done in your browser for maximum privacy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
