'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@heroicons/react/24/outline';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function PricingPage() {
  const { t } = useTranslation();

  const tiers = [
    {
      name: t('pricing.free.title'),
      id: 'free',
      price: t('pricing.free.price'),
      description: t('pricing.free.description'),
      features: t('pricing.free.features', { returnObjects: true }) as string[],
      cta: t('navigation.signup'),
      mostPopular: false,
    },
    {
      name: t('pricing.basic.title'),
      id: 'basic',
      price: t('pricing.basic.price'),
      period: t('pricing.basic.period'),
      description: t('pricing.basic.description'),
      features: t('pricing.basic.features', { returnObjects: true }) as string[],
      cta: t('navigation.signup'),
      mostPopular: true,
    },
    {
      name: t('pricing.premium.title'),
      id: 'premium',
      price: t('pricing.premium.price'),
      period: t('pricing.premium.period'),
      description: t('pricing.premium.description'),
      features: t('pricing.premium.features', { returnObjects: true }) as string[],
      cta: t('navigation.signup'),
      mostPopular: false,
    },
  ];

  return (
    <MainLayout>
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">{t('pricing.title')}</h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {t('pricing.subtitle')}
            </p>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
            Choose the perfect plan for your PDF needs. Upgrade or downgrade at any time.
          </p>
          <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`ring-1 ring-gray-200 rounded-3xl p-8 xl:p-10 ${
                  tier.mostPopular ? 'ring-2 ring-primary-600' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className={`text-lg font-semibold leading-8 ${tier.mostPopular ? 'text-primary-600' : 'text-gray-900'}`}>
                    {tier.name}
                  </h3>
                  {tier.mostPopular && (
                    <p className="rounded-full bg-primary-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-primary-600">
                      Most popular
                    </p>
                  )}
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-600">{tier.description}</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">{tier.price}</span>
                  {tier.period && <span className="text-sm font-semibold leading-6 text-gray-600">{tier.period}</span>}
                </p>
                <Link href="/signup">
                  <Button
                    variant={tier.mostPopular ? 'primary' : 'outline'}
                    className="mt-6"
                    fullWidth
                  >
                    {tier.cta}
                  </Button>
                </Link>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckIcon className="h-6 w-5 flex-none text-primary-600" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
