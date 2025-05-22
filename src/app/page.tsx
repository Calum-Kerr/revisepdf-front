'use client';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import Image from 'next/image';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import {
  DocumentArrowDownIcon,
  DocumentDuplicateIcon,
  DocumentMinusIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const { t } = useTranslation();

  const features = [
    {
      name: t('tools.compress.title'),
      description: t('tools.compress.description'),
      href: '/tools/compress',
      icon: DocumentArrowDownIcon,
    },
    {
      name: t('tools.merge.title'),
      description: t('tools.merge.description'),
      href: '/tools/merge',
      icon: DocumentDuplicateIcon,
    },
    {
      name: t('tools.split.title'),
      description: t('tools.split.description'),
      href: '/tools/split',
      icon: DocumentMinusIcon,
    },
    {
      name: t('tools.convert.title'),
      description: t('tools.convert.description'),
      href: '/tools/convert',
      icon: DocumentArrowUpIcon,
    },
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            <div className="mt-24 sm:mt-32 lg:mt-16">
              <Link href="/pricing" className="inline-flex space-x-6">
                <span className="rounded-full bg-primary-500/10 px-3 py-1 text-sm font-semibold leading-6 text-primary-600 ring-1 ring-inset ring-primary-500/20">
                  {t('pricing.title')}
                </span>
                <span className="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-600">
                  <span>Just released: Batch Processing</span>
                </span>
              </Link>
            </div>
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              {t('home.hero_title')}
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {t('home.hero_subtitle')}
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link href="/tools">
                <Button size="lg">{t('home.get_started')}</Button>
              </Link>
              <Link href="/pricing" className="text-sm font-semibold leading-6 text-gray-900">
                {t('home.learn_more')} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none xl:ml-32">
            <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                <div className="w-[76rem] rounded-md shadow-2xl ring-1 ring-gray-900/10 bg-gray-100 h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <DocumentArrowDownIcon className="h-16 w-16 text-primary-500 mx-auto" />
                    <p className="mt-4 text-lg font-semibold text-gray-900">PDF Tools Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">PDF Tools</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to work with PDFs
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Our comprehensive suite of PDF tools helps you manage, edit, and transform your PDF documents quickly and efficiently.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {features.map((feature) => (
                <div key={feature.name} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
                  <div className="mt-4">
                    <Link href={feature.href} className="text-sm font-semibold leading-6 text-primary-600 hover:text-primary-500">
                      Use this tool <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
