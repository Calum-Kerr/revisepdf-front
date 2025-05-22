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
import { supabase } from '@/lib/supabase/client';

// Define types for better type safety

interface UserData {
  name: string;
  email: string;
  plan: string;
  usedStorage: number; // MB
  totalStorage: number; // MB
}

// Default user data
const defaultUserData: UserData = {
  name: '',
  email: '',
  plan: 'Free',
  usedStorage: 0,
  totalStorage: 5,
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

      // Always try to fetch the latest profile data directly from Supabase
      try {
        console.log('Fetching user profile directly for user ID:', currentUser.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          console.error('Error fetching profile from database:', error);
          // If we can't fetch the profile, use the one from context if available
          if (profile) {
            console.log('Using profile from context instead');
            const userProfile = profile;
            updatedUserData.plan = userProfile.subscription_tier?.charAt(0).toUpperCase() +
                                  userProfile.subscription_tier?.slice(1) || 'Free';
            updatedUserData.usedStorage = userProfile.usage ? userProfile.usage / (1024 * 1024) : 0;
            updatedUserData.totalStorage = userProfile.file_size_limit ?
                                         userProfile.file_size_limit / (1024 * 1024) : 5;
          }
        } else if (data) {
          console.log('Profile fetched successfully:', data);
          // Use the fetched profile data
          updatedUserData.plan = data.subscription_tier?.charAt(0).toUpperCase() +
                                data.subscription_tier?.slice(1) || 'Free';
          updatedUserData.usedStorage = data.usage ? data.usage / (1024 * 1024) : 0; // Convert bytes to MB
          updatedUserData.totalStorage = data.file_size_limit ?
                                       data.file_size_limit / (1024 * 1024) : 5; // Convert bytes to MB
        } else {
          console.log('No profile data found, using defaults');
        }
      } catch (profileError) {
        console.error('Exception fetching profile:', profileError);
        // Continue with default values if profile fetch fails
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
                    {userData.usedStorage.toFixed(1)}MB / {userData.totalStorage}MB used
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary-500"
                    style={{ width: `${Math.min((userData.usedStorage / userData.totalStorage) * 100, 100)}%` }}
                  ></div>
                </div>
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
