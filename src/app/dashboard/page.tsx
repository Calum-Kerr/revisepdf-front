'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { 
  DocumentArrowDownIcon, 
  DocumentArrowUpIcon, 
  DocumentDuplicateIcon, 
  DocumentMinusIcon,
  ClockIcon,
  CreditCardIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { t } = useTranslation();

  // Mock user data
  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    plan: 'Basic',
    usedStorage: 12.5, // MB
    totalStorage: 20, // MB
    recentFiles: [
      { id: 1, name: 'business_report.pdf', size: 2.4, date: '2023-05-15', type: 'compress' },
      { id: 2, name: 'contract_final.pdf', size: 1.8, date: '2023-05-14', type: 'split' },
      { id: 3, name: 'presentation.pdf', size: 3.2, date: '2023-05-12', type: 'merge' },
    ],
  };

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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* User Profile Card */}
            <div className="col-span-1 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center">
                <UserCircleIcon className="h-12 w-12 text-gray-400" />
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">{user.name}</h2>
                  <p className="text-sm text-gray-500">{user.email}</p>
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
                  <h2 className="text-lg font-medium text-gray-900">Current Plan: {user.plan}</h2>
                  <p className="text-sm text-gray-500">
                    {user.usedStorage.toFixed(1)}MB / {user.totalStorage}MB used
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary-500"
                    style={{ width: `${(user.usedStorage / user.totalStorage) * 100}%` }}
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
                <Link href="/tools/compress">
                  <Button variant="outline" size="sm" fullWidth leftIcon={<DocumentArrowDownIcon className="h-5 w-5" />}>
                    Compress
                  </Button>
                </Link>
                <Link href="/tools/merge">
                  <Button variant="outline" size="sm" fullWidth leftIcon={<DocumentDuplicateIcon className="h-5 w-5" />}>
                    Merge
                  </Button>
                </Link>
                <Link href="/tools/split">
                  <Button variant="outline" size="sm" fullWidth leftIcon={<DocumentMinusIcon className="h-5 w-5" />}>
                    Split
                  </Button>
                </Link>
                <Link href="/tools/convert">
                  <Button variant="outline" size="sm" fullWidth leftIcon={<DocumentArrowUpIcon className="h-5 w-5" />}>
                    Convert
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Files */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Recent Files</h2>
              <Link href="/files" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                View all
              </Link>
            </div>
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
                  {user.recentFiles.map((file) => (
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
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
