'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileUpload } from '@/components/pdf/FileUpload';
import { Button } from '@/components/ui/Button';
import { compressPDF } from '@/lib/pdf/pdfUtils';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, recordFileOperation } from '@/lib/supabase/client';
import { ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function CompressPDFPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, session, isLoading } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<Blob | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);

  // Authentication states
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [showFallbackContent, setShowFallbackContent] = useState(false);

  // File size error state
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // If still loading auth state, wait
        if (isLoading) {
          console.log('Auth context still loading, waiting...');
          return;
        }

        // First check if we have a user in the auth context
        if (user && session) {
          console.log('User found in auth context:', user.id);
          setAuthState('authenticated');
          return;
        }

        // If not in context, direct check with Supabase to ensure we have a valid session
        console.log('No user in context, checking with Supabase directly');
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();

        if (supabaseSession) {
          console.log('Valid session found for compress tool:', supabaseSession.user.id);

          // Try to refresh the session to ensure it's valid
          try {
            const { data } = await supabase.auth.refreshSession();
            if (data.session) {
              console.log('Session refreshed successfully');
              setAuthState('authenticated');

              // Force a refresh of the auth context
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('visibilitychange'));
              }
              return;
            }
          } catch (refreshError) {
            console.error('Error refreshing session:', refreshError);
          }

          // Even if refresh fails, if we have a session, consider authenticated
          setAuthState('authenticated');
        } else {
          console.log('No valid session found for compress tool');
          setAuthState('unauthenticated');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setAuthState('unauthenticated');
      }
    };

    checkAuth();

    // Set a timeout to show content anyway after 5 seconds
    const fallbackTimer = setTimeout(() => {
      if (authState === 'loading') {
        console.log('Auth check taking too long, showing fallback content');
        setShowFallbackContent(true);
      }
    }, 5000);

    return () => clearTimeout(fallbackTimer);
  }, [isLoading, user, session, authState]);

  const handleFilesAccepted = (files: File[]) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      setFile(selectedFile);
      setOriginalSize(selectedFile.size);
      setCompressedFile(null);
      setCompressedSize(0);
      setFileSizeError(null);
      setShowUpgradePrompt(false);
    }
  };

  const handleFileSizeError = (message: string) => {
    setFileSizeError(message);
    setShowUpgradePrompt(true);
    // Clear any previously selected file
    setFile(null);
    setOriginalSize(0);
    setCompressedFile(null);
    setCompressedSize(0);
  };

  const handleCompress = async () => {
    console.log('Compress button clicked');

    if (!file) {
      toast.error('Please upload a PDF file first');
      console.error('No file selected for compression');
      return;
    }

    console.log(`File selected for compression: ${file.name}, size: ${formatFileSize(file.size)}`);

    // Check file size against subscription limits
    if (profile) {
      console.log(`Checking against subscription limits. User tier: ${profile.subscription_tier}`);

      // Check if file exceeds subscription tier limit
      const maxFileSizeMB = profile.max_file_size_mb || 10; // Default to 10MB if not set
      const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

      if (file.size > maxFileSizeBytes) {
        const tierName = profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1);
        const errorMessage = `File size (${formatFileSize(file.size)}) exceeds your ${tierName} plan limit of ${maxFileSizeMB}MB.`;
        console.error(errorMessage);
        toast.error(errorMessage);
        setFileSizeError(errorMessage);
        setShowUpgradePrompt(true);
        return;
      }

      // For pay-per-use tier, show estimated cost
      if (profile.subscription_tier === 'pay_per_use') {
        const fileSizeMB = file.size / (1024 * 1024);
        const estimatedCost = Math.min(Math.ceil(fileSizeMB / 10) * 0.10, 2.00);
        toast.info(`Estimated cost: $${estimatedCost.toFixed(2)}`);
      }

      // For subscription tiers, check usage limits
      if (['personal', 'power_user', 'heavy_user'].includes(profile.subscription_tier)) {
        const monthlyLimit = profile.monthly_files_limit || 0;
        const monthlyUsed = profile.monthly_files_used || 0;

        if (monthlyLimit > 0 && monthlyUsed >= monthlyLimit) {
          const errorMessage = `You have reached your monthly limit of ${monthlyLimit} files for your ${profile.subscription_tier} plan.`;
          console.error(errorMessage);
          toast.error(errorMessage);
          setFileSizeError(errorMessage);
          setShowUpgradePrompt(true);
          return;
        }
      }

      // For free tier, check daily limits
      if (profile.subscription_tier === 'free') {
        const dailyLimit = profile.daily_files_limit || 5;
        const dailyUsed = profile.daily_files_used || 0;

        if (dailyUsed >= dailyLimit) {
          const errorMessage = `You have reached your daily limit of ${dailyLimit} files for the free plan.`;
          console.error(errorMessage);
          toast.error(errorMessage);
          setFileSizeError(errorMessage);
          setShowUpgradePrompt(true);
          return;
        }
      }

      console.log('File size and usage checks passed, proceeding with compression');
    }

    try {
      setIsCompressing(true);
      console.log(`Starting compression with level: ${compressionLevel}`);

      // Map compression level to quality value (0-1)
      const qualityMap = {
        low: 0.5,
        medium: 0.7,
        high: 0.9,
      };

      const qualityValue = qualityMap[compressionLevel];
      console.log(`Using quality value: ${qualityValue}`);

      // Show a toast to indicate compression has started with a unique ID
      const toastId = `compression-toast-${Date.now()}`;
      toast.loading('Compressing your PDF...', { id: toastId });

      // Add a small delay to ensure UI updates before heavy processing
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('Calling compressPDF function...');
      const compressed = await compressPDF(file, qualityValue);
      console.log(`Compression complete. Original: ${formatFileSize(file.size)}, Compressed: ${formatFileSize(compressed.size)}`);

      setCompressedFile(compressed);
      setCompressedSize(compressed.size);

      // Record the file operation and update the user's storage usage
      if (user) {
        try {
          console.log(`Recording compression operation for user ${user.id} with file size: ${compressed.size} bytes`);

          const operationResult = await recordFileOperation(
            user.id,
            'compress',
            compressed.size,
            1, // Single file
            file.name,
            `compressed_${file.name}`
          );

          if (operationResult) {
            if (operationResult.is_valid) {
              console.log('Operation recorded successfully:', operationResult);

              // If it's a pay-per-use operation, show the cost
              if (operationResult.cost_cents > 0) {
                toast.success(`Operation cost: $${(operationResult.cost_cents / 100).toFixed(2)}`);
              }

              // Update the UI by dispatching an event
              if (typeof window !== 'undefined') {
                // Create a custom event with the operation result
                const event = new CustomEvent('operation-recorded', {
                  detail: { operationResult }
                });

                // Dispatch the event
                window.dispatchEvent(event);

                // Also dispatch the legacy event for backward compatibility
                const legacyEvent = new CustomEvent('storage-usage-updated', {
                  detail: { operationResult }
                });
                window.dispatchEvent(legacyEvent);

                // Also force a refresh of the auth context
                window.dispatchEvent(new Event('visibilitychange'));

                // Set a flag in localStorage to ensure the dashboard gets updated
                localStorage.setItem('storage-usage-last-updated', Date.now().toString());
              }
            } else {
              // Operation was not valid (e.g., exceeded limits)
              console.warn('Operation validation failed:', operationResult.error_message);
              toast.error(operationResult.error_message || 'Failed to process file due to account limits');
            }
          } else {
            console.warn('Failed to record operation');
          }
        } catch (operationError) {
          console.error('Error recording operation:', operationError);
          // Continue even if operation recording fails
        }
      }

      // Dismiss the loading toast and show success
      toast.dismiss(toastId);
      toast.success('PDF compressed successfully!');
    } catch (error) {
      console.error('Error in handleCompress function:', error);

      // Dismiss the loading toast
      toast.dismiss(toastId);

      // Show a more detailed error message
      let errorMessage = 'Failed to compress PDF. Please try again.';

      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);
        errorMessage = `Compression failed: ${error.message}`;
      }

      toast.error(errorMessage);
    } finally {
      setIsCompressing(false);
      console.log('Compression process completed (success or failure)');
    }
  };

  const handleDownload = () => {
    if (!compressedFile) return;

    const url = URL.createObjectURL(compressedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed_${file?.name || 'document.pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateReduction = () => {
    if (!originalSize || !compressedSize) return 0;
    return Math.round(((originalSize - compressedSize) / originalSize) * 100);
  };

  // Show loading state
  if (authState === 'loading' && !showFallbackContent) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-primary-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Loading PDF Compression Tool...</h3>
            <p className="mt-1 text-sm text-gray-500">Please wait while we verify your account.</p>
            <button
              onClick={() => setShowFallbackContent(true)}
              className="mt-4 text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Continue anyway
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show error state
  if (authState === 'unauthenticated' && !showFallbackContent) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Authentication Required</h3>
            <p className="mt-1 text-sm text-gray-500">Please log in to access the PDF compression tool.</p>
            <div className="mt-6">
              <Button
                onClick={() => router.push('/login?redirect=/tools/compress')}
                variant="primary"
              >
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{t('tools.compress.title')}</h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {t('tools.compress.description')}
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20">
            <div className="space-y-10">
              <div className="border-b border-gray-200 pb-10">
                <h3 className="text-base font-semibold leading-7 text-gray-900">1. {t('tools.compress.upload_prompt')}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Select a PDF file from your device to compress
                </p>
                <div className="mt-6">
                  <FileUpload
                    onFilesAccepted={handleFilesAccepted}
                    onFileSizeError={handleFileSizeError}
                    maxSize={5 * 1024 * 1024} // 5MB default for free tier, will be adjusted based on subscription
                    toolType="compress"
                  />
                </div>

                {/* File Size Error and Upgrade Prompt */}
                {fileSizeError && showUpgradePrompt && (
                  <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">File Size Limit Exceeded</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>{fileSizeError}</p>
                          <div className="mt-4">
                            <Button
                              onClick={() => router.push('/pricing')}
                              variant="primary"
                              size="sm"
                            >
                              Upgrade Your Plan
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {file && (
                  <div className="mt-4 text-sm text-gray-500">
                    Original size: {formatFileSize(originalSize)}
                  </div>
                )}
              </div>

              {file && (
                <div className="border-b border-gray-200 pb-10">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">2. Select compression level</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Choose how much you want to compress your PDF
                  </p>
                  <div className="mt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        type="button"
                        onClick={() => setCompressionLevel('low')}
                        className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ${
                          compressionLevel === 'low'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Low Quality (Smallest Size)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompressionLevel('medium')}
                        className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ${
                          compressionLevel === 'medium'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Medium Quality (Recommended)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompressionLevel('high')}
                        className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ${
                          compressionLevel === 'high'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        High Quality (Larger Size)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {file && (
                <div className="border-b border-gray-200 pb-10">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">3. Compress your PDF</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Click the button below to compress your PDF
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={handleCompress}
                      isLoading={isCompressing}
                      disabled={!file || isCompressing}
                      fullWidth
                    >
                      {isCompressing ? 'Compressing...' : t('tools.compress.compress_button')}
                    </Button>
                  </div>
                </div>
              )}

              {compressedFile && (
                <div>
                  <h3 className="text-base font-semibold leading-7 text-gray-900">4. Download compressed PDF</h3>
                  <div className="mt-6 rounded-lg bg-gray-50 px-6 py-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">Compression Results</h4>
                        <div className="mt-2 text-sm text-gray-500">
                          <p>Original size: {formatFileSize(originalSize)}</p>
                          <p>Compressed size: {formatFileSize(compressedSize)}</p>
                          <p>Reduction: {calculateReduction()}%</p>
                        </div>
                      </div>
                      <Button onClick={handleDownload} variant="primary">
                        {t('tools.compress.download_button')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
