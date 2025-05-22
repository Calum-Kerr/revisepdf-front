'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';

export default function TermsPage() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <div className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Terms of Service
            </h1>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Last updated: May 22, 2025
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl space-y-8 text-gray-600">
            <section>
              <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
              <p className="mt-2">
                Welcome to RevisePDF, a project created by Calum, a student at Edinburgh Napier University based in Edinburgh, Scotland. These Terms of Service govern your use of this website and services. By using RevisePDF, you agree to these terms. Please read them carefully.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">2. Definitions</h2>
              <p className="mt-2">
                "Service" refers to the RevisePDF application, which allows users to manipulate PDF files through various tools including compression, merging, splitting, and conversion.
              </p>
              <p className="mt-2">
                "User" refers to any individual who accesses or uses our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">3. Use of Service</h2>
              <p className="mt-2">
                RevisePDF provides tools for PDF manipulation. You may use our Service only as permitted by law and according to these Terms. The Service is available in different subscription tiers with varying features and limitations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">4. User Accounts</h2>
              <p className="mt-2">
                Some features of the Service require you to register for an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">5. Subscription and Payments</h2>
              <p className="mt-2">
                RevisePDF offers free and paid subscription plans. By subscribing to a paid plan, you agree to pay the fees indicated for that plan. Payments are processed securely through our payment processors.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">6. Privacy</h2>
              <p className="mt-2">
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information. By using our Service, you agree to our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">7. Intellectual Property</h2>
              <p className="mt-2">
                The Service and its original content, features, and functionality are owned by RevisePDF and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">8. Termination</h2>
              <p className="mt-2">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users of the Service, us, or third parties, or for any other reason.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">9. Limitation of Liability</h2>
              <p className="mt-2">
                In no event shall RevisePDF be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">10. Changes to Terms</h2>
              <p className="mt-2">
                We reserve the right to modify these Terms at any time. We will provide notice of any significant changes. Your continued use of the Service after such modifications constitutes your acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">11. Contact Us</h2>
              <p className="mt-2">
                If you have any questions about these Terms, please contact me at calum@revisepdf.com.
              </p>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
