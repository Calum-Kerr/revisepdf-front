'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '../ui/Button';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  translationKey: string;
}

const navigation: NavItem[] = [
  { name: 'Home', href: '/', translationKey: 'navigation.home' },
  { name: 'Dashboard', href: '/dashboard', translationKey: 'navigation.dashboard' },
  { name: 'Tools', href: '/tools', translationKey: 'navigation.tools' },
  { name: 'Pricing', href: '/pricing', translationKey: 'navigation.pricing' },
];

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, session, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <header className="bg-white shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="text-2xl font-bold text-primary-500">{t('app_name')}</span>
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-sm font-semibold leading-6 ${
                pathname === item.href
                  ? 'text-primary-600'
                  : 'text-gray-900 hover:text-primary-500'
              }`}
            >
              {t(item.translationKey)}
            </Link>
          ))}
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
          <LanguageSwitcher />

          {user && session ? (
            <div className="flex items-center gap-x-4">
              <Link href="/dashboard">
                <div className="flex items-center gap-x-2">
                  <UserCircleIcon className="h-6 w-6 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {user.email?.split('@')[0]}
                  </span>
                </div>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                {t('navigation.logout')}
              </Button>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  {t('navigation.login')}
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  {t('navigation.signup')}
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50" />
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5">
                <span className="text-2xl font-bold text-primary-500">{t('app_name')}</span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 ${
                        pathname === item.href
                          ? 'text-primary-600 bg-gray-50'
                          : 'text-gray-900 hover:bg-gray-50'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t(item.translationKey)}
                    </Link>
                  ))}
                </div>
                <div className="py-6">
                  {user && session ? (
                    <>
                      <Link
                        href="/dashboard"
                        className="-mx-3 flex items-center rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <UserCircleIcon className="h-6 w-6 mr-2 text-gray-500" />
                        {user.email?.split('@')[0]}
                      </Link>
                      <button
                        onClick={() => {
                          handleSignOut();
                          setMobileMenuOpen(false);
                        }}
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                      >
                        {t('navigation.logout')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t('navigation.login')}
                      </Link>
                      <Link
                        href="/signup"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t('navigation.signup')}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
