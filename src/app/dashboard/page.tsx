'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import {
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  DocumentDuplicateIcon,
  DocumentMinusIcon,
  ClockIcon,
  CreditCardIcon,
  UserCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { supabase, getUserStats, getSubscriptionDisplayName } from '@/lib/supabase/client';

// Define types for better type safety

interface UserData {
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

// Default user data
const defaultUserData: UserData = {
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
};

// PDF tool definitions
const pdfTools = [
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Reduce file size while maintaining quality',
    icon: DocumentArrowDownIcon,
    path: '/tools/compress',
  },
  {
    id: 'merge',
    name: 'Merge PDFs',
    description: 'Combine multiple PDFs into one document',
    icon: DocumentDuplicateIcon,
    path: '/tools/merge',
  },
  {
    id: 'split',
    name: 'Split PDF',
    description: 'Divide a PDF into separate pages or sections',
    icon: DocumentMinusIcon,
    path: '/tools/split',
  },
  {
    id: 'convert',
    name: 'Convert PDF',
    description: 'Convert PDFs to and from other formats',
    icon: DocumentArrowUpIcon,
    path: '/tools/convert',
  },
];

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, profile, session, isLoading } = useAuth();
  const router = useRouter();

  // State management
  const [userData, setUserData] = useState<UserData>(defaultUserData);
  const [loadingState, setLoadingState] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Function to fetch user data
  const fetchUserData = async () => {
    try {
      setLoadingState('loading');
      console.log('Fetching user data...');

      // Get the current session directly from Supabase
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!currentSession) {
        console.error('No active session found in fetchUserData');
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

      // Update user data with available information
      const updatedUserData = {
        ...defaultUserData,
        name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
        email: currentUser.email || 'No email available',
      };

      console.log('Basic user data set');

      // Get the user's stats from Supabase
      try {
        console.log('Fetching user stats for user ID:', currentUser.id);

        const userStats = await getUserStats(currentUser.id);

        if (userStats) {
          console.log('User stats fetched successfully:', userStats);

          // Convert bytes to MB for display
          const totalProcessedMB = userStats.total_processed_bytes / (1024 * 1024);
          console.log(`Total processed: ${totalProcessedMB.toFixed(2)} MB`);

          // Update the user data with the stats
          updatedUserData.plan = getSubscriptionDisplayName(userStats.subscription_tier as any);
          updatedUserData.usedStorage = totalProcessedMB;
          updatedUserData.totalStorage = userStats.max_file_size_mb;
          updatedUserData.dailyFilesUsed = userStats.daily_files_used;
          updatedUserData.dailyFilesLimit = userStats.daily_files_limit;
          updatedUserData.monthlyFilesUsed = userStats.monthly_files_used;
          updatedUserData.monthlyFilesLimit = userStats.monthly_files_limit;
          updatedUserData.maxBatchSize = userStats.max_batch_size;
          updatedUserData.daysUntilRenewal = userStats.days_until_renewal;
        } else {
          console.log('No user stats found, using defaults');

          // If we can't fetch the stats, use the profile from context if available
          if (profile) {
            console.log('Using profile from context instead');
            updatedUserData.plan = getSubscriptionDisplayName(profile.subscription_tier);
          }
        }
      } catch (statsError) {
        console.error('Exception fetching user stats:', statsError);
        // Continue with default values if stats fetch fails
      }

      console.log('Setting user data and success state');
      setUserData(updatedUserData);
      setLoadingState('success');
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      setLoadingState('error');
      setErrorMessage(error.message || 'Failed to load user data. Please try again.');
    }
  };

  // Listen for storage usage updates
  useEffect(() => {
    // Create a memoized version of fetchUserData that doesn't change on re-renders
    const refreshDashboardData = (event: Event) => {
      console.log('Storage usage update detected, refreshing dashboard data');

      // Check if we have operation result data in the event
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.operationResult) {
        console.log('Received operation result in event:', customEvent.detail.operationResult);

        // Fetch the latest data to get updated stats
        fetchUserData();
      } else if (customEvent.detail && customEvent.detail.profile) {
        console.log('Received updated profile in event (legacy format):', customEvent.detail.profile);

        // For backward compatibility, still handle the old event format
        // but fetch fresh data to ensure we have all the new stats
        fetchUserData();
      } else {
        // If no data in event, fetch the data
        fetchUserData();
      }
    };

    // Also listen for localStorage changes
    const handleStorageChange = () => {
      const lastUpdated = localStorage.getItem('storage-usage-last-updated');
      if (lastUpdated) {
        console.log('Storage usage last updated at:', new Date(parseInt(lastUpdated)));
        // Clear the flag to avoid duplicate refreshes
        localStorage.removeItem('storage-usage-last-updated');
        // Fetch the latest data
        fetchUserData();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage-usage-updated', refreshDashboardData);
      window.addEventListener('operation-recorded', refreshDashboardData); // New event name
      window.addEventListener('storage', handleStorageChange);

      // Check for storage update flag on mount
      handleStorageChange();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage-usage-updated', refreshDashboardData);
        window.removeEventListener('operation-recorded', refreshDashboardData); // New event name
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []);

  // Refresh data when the page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Dashboard page became visible, refreshing data');
        fetchUserData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Check authentication and load user data
  useEffect(() => {
    console.log('Dashboard useEffect triggered, isLoading:', isLoading);

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
              console.log('Session refreshed successfully, proceeding to fetch user data');
              // Proceed with loading user data with a small delay to ensure state updates
              setTimeout(() => {
                fetchUserData();
              }, 100);
            } else {
              console.log('Session refresh failed, using existing session');
              // Still try to fetch user data with the existing session
              fetchUserData();
            }
          } catch (refreshError) {
            console.error('Error refreshing session:', refreshError);
            // Still try to fetch user data with the existing session
            fetchUserData();
          }
        } else {
          console.log('No valid session found, redirecting to login');
          // Force a hard redirect to login to avoid middleware issues
          window.location.href = '/login?redirect=/dashboard';
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
  }, [isLoading, loadingState, fetchUserData]);

  // No helper functions needed for file types since we don't store files

  // Loading state with timeout
  const [showFallbackDashboard, setShowFallbackDashboard] = useState(false);

  // Set a timeout to show fallback dashboard if loading takes too long
  useEffect(() => {
    let fallbackTimer: NodeJS.Timeout;

    if (loadingState === 'loading') {
      fallbackTimer = setTimeout(() => {
        console.log('Loading timeout reached, showing fallback dashboard');
        setShowFallbackDashboard(true);
      }, 5000); // 5 seconds timeout
    }

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [loadingState]);

  // Show loading state unless fallback is triggered
  if (loadingState === 'loading' && !showFallbackDashboard) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-primary-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Loading your dashboard...</h3>
            <p className="mt-1 text-sm text-gray-500">Please wait while we fetch your information.</p>
            <button
              onClick={() => setShowFallbackDashboard(true)}
              className="mt-4 text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Show dashboard anyway
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // If loading takes too long, show the dashboard with default data
  if (loadingState === 'loading' && showFallbackDashboard) {
    console.log('Showing fallback dashboard with default data');
    // Continue to the dashboard render below with default data
  }

  // Error state
  if (loadingState === 'error') {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Dashboard</h3>
            <p className="mt-1 text-sm text-gray-500">{errorMessage || 'An unexpected error occurred.'}</p>
            <div className="mt-6">
              <Button
                onClick={fetchUserData}
                variant="outline"
                leftIcon={<ArrowPathIcon className="h-5 w-5" />}
              >
                Try Again
              </Button>
              <Button
                onClick={() => router.push('/login?redirect=/dashboard')}
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

  // Success state - render dashboard
  return (
    <MainLayout>
      <div className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your PDF tools and account
            </p>
          </div>

          {/* User and Subscription Info */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* User Profile Card */}
            <div className="col-span-1 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center">
                <UserCircleIcon className="h-12 w-12 text-gray-400" />
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">{userData.name}</h2>
                  <p className="text-sm text-gray-500">{userData.email}</p>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/profile">
                  <Button variant="outline" size="sm">
                    Edit Profile
                  </Button>
                </Link>
              </div>
            </div>

            {/* Subscription Card */}
            <div className="col-span-1 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center">
                <CreditCardIcon className="h-8 w-8 text-primary-500" />
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">Current Plan: {userData.plan}</h2>
                  <p className="text-sm text-gray-500">
                    Max file size: {userData.totalStorage}MB
                  </p>
                </div>
              </div>

              {/* File usage limits */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700">File Usage</h3>
                {userData.plan === 'Free' && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Daily: {userData.dailyFilesUsed} / {userData.dailyFilesLimit} files</p>
                    <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-primary-500"
                        style={{ width: `${Math.min((userData.dailyFilesUsed / userData.dailyFilesLimit) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {(userData.plan === 'Personal' || userData.plan === 'Power User' || userData.plan === 'Heavy User') && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Monthly: {userData.monthlyFilesUsed} / {userData.monthlyFilesLimit} files</p>
                    <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-primary-500"
                        style={{ width: `${Math.min((userData.monthlyFilesUsed / userData.monthlyFilesLimit) * 100, 100)}%` }}
                      ></div>
                    </div>
                    {userData.daysUntilRenewal > 0 && (
                      <p className="mt-1 text-xs text-gray-500">Renews in {userData.daysUntilRenewal} days</p>
                    )}
                  </div>
                )}

                {userData.plan === 'Pay-Per-Use' && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Pay only for what you use</p>
                    <p className="text-xs text-gray-500">$0.10 per 10MB, $0.05 per additional file in batch</p>
                  </div>
                )}

                {userData.plan === 'Unlimited Personal' && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Unlimited usage</p>
                  </div>
                )}

                {userData.maxBatchSize > 1 && (
                  <p className="mt-2 text-xs text-gray-500">Batch processing: Up to {userData.maxBatchSize} files</p>
                )}
              </div>

              <div className="mt-4">
                <Link href="/pricing">
                  <Button variant="primary" size="sm">
                    Upgrade Plan
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="col-span-1 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {pdfTools.slice(0, 4).map((tool) => (
                  <Link key={tool.id} href={tool.path}>
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      leftIcon={<tool.icon className="h-5 w-5" />}
                    >
                      {tool.id.charAt(0).toUpperCase() + tool.id.slice(1)}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* PDF Tools Section */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900">PDF Tools</h2>
            <p className="mt-1 text-sm text-gray-500">
              Powerful tools to help you work with PDF documents
            </p>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {pdfTools.map((tool) => (
                <Link key={tool.id} href={tool.path} className="block">
                  <div className="h-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-primary-500 hover:shadow-md">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50">
                      <tool.icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">{tool.name}</h3>
                    <p className="mt-2 text-sm text-gray-500">{tool.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              RevisePDF does not store your files. All processing is done in your browser for maximum privacy.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
