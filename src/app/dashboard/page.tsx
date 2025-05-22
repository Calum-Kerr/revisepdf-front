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
interface RecentFile {
  id: number;
  name: string;
  size: number;
  date: string;
  type: 'compress' | 'merge' | 'split' | 'convert';
}

interface UserData {
  name: string;
  email: string;
  plan: string;
  usedStorage: number; // MB
  totalStorage: number; // MB
  recentFiles: RecentFile[];
}

// Default user data
const defaultUserData: UserData = {
  name: '',
  email: '',
  plan: 'Free',
  usedStorage: 0,
  totalStorage: 5,
  recentFiles: [
    { id: 1, name: 'business_report.pdf', size: 2.4, date: '2023-05-15', type: 'compress' },
    { id: 2, name: 'contract_final.pdf', size: 1.8, date: '2023-05-14', type: 'split' },
    { id: 3, name: 'presentation.pdf', size: 3.2, date: '2023-05-12', type: 'merge' },
  ],
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

      // Verify session directly with Supabase as a fallback
      if (!session) {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        if (!supabaseSession) {
          setLoadingState('error');
          setErrorMessage('No active session found. Please log in again.');
          return;
        }
      }

      if (!user) {
        setLoadingState('error');
        setErrorMessage('User information not available. Please log in again.');
        return;
      }

      // Update user data with available information
      const updatedUserData = {
        ...defaultUserData,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || 'No email available',
      };

      // If profile is available, update subscription info
      if (profile) {
        updatedUserData.plan = profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1);
        updatedUserData.usedStorage = profile.usage / (1024 * 1024); // Convert bytes to MB
        updatedUserData.totalStorage = profile.file_size_limit / (1024 * 1024); // Convert bytes to MB
      }

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
    // If still loading auth state, wait
    if (isLoading) {
      return;
    }

    // If not authenticated, redirect to login
    if (!user || !session) {
      console.log('No authenticated user found, redirecting to login');
      router.push('/login?redirect=/dashboard');
      return;
    }

    // Fetch user data
    fetchUserData();
  }, [user, session, isLoading, router]);

  // Helper function to get the appropriate icon for file types
  const getToolIcon = (type: string) => {
    switch (type) {
      case 'compress':
        return <DocumentArrowDownIcon className="h-5 w-5 text-primary-500" />;
      case 'merge':
        return <DocumentDuplicateIcon className="h-5 w-5 text-primary-500" />;
      case 'split':
        return <DocumentMinusIcon className="h-5 w-5 text-primary-500" />;
      case 'convert':
        return <DocumentArrowUpIcon className="h-5 w-5 text-primary-500" />;
      default:
        return <DocumentArrowDownIcon className="h-5 w-5 text-primary-500" />;
    }
  };

  // Loading state
  if (loadingState === 'loading') {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-primary-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Loading your dashboard...</h3>
            <p className="mt-1 text-sm text-gray-500">Please wait while we fetch your information.</p>
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

          {/* Recent Files */}
          <div className="mt-12">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Files</h2>
              <Link href="/files" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                View all
              </Link>
            </div>

            {userData.recentFiles.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        File
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Size
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {userData.recentFiles.map((file) => (
                      <tr key={file.id}>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            {getToolIcon(file.type)}
                            <span className="ml-2 text-sm font-medium text-gray-900">{file.name}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{file.size} MB</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <ClockIcon className="mr-1 h-4 w-4 text-gray-400" />
                            {file.date}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <Button variant="link" size="sm">
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
                <p className="text-gray-500">No recent files found. Start using our PDF tools to see your files here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
