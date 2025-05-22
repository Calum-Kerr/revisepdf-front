'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <div className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Last updated: May 22, 2025
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl space-y-8 text-gray-600">
            <section>
              <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
              <p className="mt-2">
                Welcome to RevisePDF, a project created by Calum, a student at Edinburgh Napier University based in Edinburgh, Scotland. I respect your privacy and am committed to protecting your personal data. This Privacy Policy explains how I collect, use, and safeguard your information when you use this website and services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">2. Information I Collect</h2>
              <p className="mt-2">
                <strong>Personal Information:</strong> When you register for an account, I collect your email address, name, and password. If you subscribe to a paid plan, I collect payment information through secure payment processors.
              </p>
              <p className="mt-2">
                <strong>Usage Data:</strong> I collect information about how you use the service, including the PDF files you upload, the tools you use, and your interaction with the website.
              </p>
              <p className="mt-2">
                <strong>Technical Data:</strong> I collect information about your device, browser, IP address, and how you interact with the website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">3. How I Use Your Information</h2>
              <p className="mt-2">
                I use your information to:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Provide and maintain the service</li>
                <li>Process your payments and manage your account</li>
                <li>Improve and personalize your experience</li>
                <li>Communicate with you about service updates and offers</li>
                <li>Monitor usage patterns and analyze trends</li>
                <li>Detect, prevent, and address technical issues</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">4. Data Security</h2>
              <p className="mt-2">
                I implement appropriate security measures to protect your personal information. Your PDF files are processed securely and are not stored permanently on the servers unless explicitly requested as part of a specific feature.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">5. Data Retention</h2>
              <p className="mt-2">
                I retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">6. Your Data Protection Rights</h2>
              <p className="mt-2">
                Depending on your location, you may have the following rights:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Access to your personal data</li>
                <li>Correction of inaccurate data</li>
                <li>Deletion of your data</li>
                <li>Restriction of processing</li>
                <li>Data portability</li>
                <li>Objection to processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">7. Cookies and Tracking Technologies</h2>
              <p className="mt-2">
                I use cookies and similar tracking technologies to track activity on the website and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">8. Third-Party Services</h2>
              <p className="mt-2">
                I may use third-party services, such as payment processors and analytics providers, that collect, monitor, and analyze data. These third parties have their own privacy policies addressing how they use such information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">9. International Data Transfers</h2>
              <p className="mt-2">
                Your information may be transferred to and processed in countries other than the country in which you reside. I ensure appropriate safeguards are in place to protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">10. Changes to This Privacy Policy</h2>
              <p className="mt-2">
                I may update this Privacy Policy from time to time. I will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">11. Contact Us</h2>
              <p className="mt-2">
                If you have any questions about this Privacy Policy, please contact me at calum@revisepdf.com.
              </p>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
