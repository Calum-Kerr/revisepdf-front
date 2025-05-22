'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import Link from 'next/link';
import {
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  DocumentDuplicateIcon,
  DocumentMinusIcon,
  GlobeAltIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function AboutPage() {
  // Translation is available but not currently used in this component
  useTranslation();

  const features = [
    {
      name: 'PDF Compression',
      description: 'Reduce file sizes without compromising quality, making your PDFs easier to share and store.',
      icon: DocumentMinusIcon,
    },
    {
      name: 'PDF Merging',
      description: 'Combine multiple PDFs into a single document for better organization and sharing.',
      icon: DocumentDuplicateIcon,
    },
    {
      name: 'PDF Splitting',
      description: 'Extract specific pages or split large documents into smaller, more manageable files.',
      icon: DocumentArrowDownIcon,
    },
    {
      name: 'PDF Conversion',
      description: 'Convert PDFs to and from various formats including Word, Excel, PowerPoint, and images.',
      icon: DocumentArrowUpIcon,
    },
    {
      name: 'Multilingual Support',
      description: 'Use RevisePDF in your preferred language with support for 8 different languages.',
      icon: GlobeAltIcon,
    },
    {
      name: 'Secure Processing',
      description: 'Your files are processed securely and not stored permanently on our servers.',
      icon: ShieldCheckIcon,
    },
  ];

  // No team array as this is a solo project

  return (
    <MainLayout>
      {/* Hero section */}
      <div className="relative isolate overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              About RevisePDF
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-900">
              RevisePDF is a powerful online platform designed to help you manage and manipulate PDF documents with ease. Created by Calum, a student at Edinburgh Napier University, this suite of tools allows you to compress, merge, split, and convert PDFs, making document management simpler and more efficient.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="/tools"
                className="rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                Explore Our Tools
              </Link>
              <Link href="/pricing" className="text-sm font-semibold leading-6 text-gray-900">
                View Pricing <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">Powerful PDF Tools</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to work with PDFs
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-900">
              This comprehensive suite of PDF tools helps you handle all your document needs in one place, saving you time and effort.
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
                  <dd className="mt-2 text-base leading-7 text-gray-900">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Developer section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">About the Developer</h2>
            <p className="mt-6 text-lg leading-8 text-gray-900">
              RevisePDF is a solo project created by Calum, a student at Edinburgh Napier University based in Edinburgh, Scotland.
            </p>
          </div>
          <div className="mx-auto mt-20 max-w-2xl">
            <div className="text-center">
              <h3 className="text-2xl font-semibold leading-8 tracking-tight text-gray-900">Calum Kerr</h3>
              <p className="mt-2 text-lg leading-7 text-gray-900">Student Developer</p>
              <div className="mt-6 max-w-xl mx-auto">
                <p className="text-base leading-7 text-gray-900">
                  I'm a student at Edinburgh Napier University with a passion for web development and creating useful tools.
                  RevisePDF started as a university project that I've continued to develop to help people work with PDF documents more efficiently.
                </p>
                <p className="mt-4 text-base leading-7 text-gray-900">
                  If you have any questions, suggestions, or feedback about RevisePDF, feel free to reach out to me at calum@revisepdf.com.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="relative isolate overflow-hidden bg-primary-700 px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to simplify your PDF workflow?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-100">
              Try RevisePDF today and simplify your document management workflow.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/signup"
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-primary-600 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Get started
              </Link>
              <Link href="/tools" className="text-sm font-semibold leading-6 text-white">
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
