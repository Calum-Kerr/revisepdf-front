'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileUpload } from '@/components/pdf/FileUpload';
import { Button } from '@/components/ui/Button';
import { mergePDFs } from '@/lib/pdf/pdfUtils';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, recordFileOperation } from '@/lib/supabase/client';
import { ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function MergePDFsPage() {
  const router = useRouter();
  const { user, profile, session, isLoading } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [mergedFile, setMergedFile] = useState<Blob | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [storageUpdated, setStorageUpdated] = useState(false);

  // Authentication states
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [showFallbackContent, setShowFallbackContent] = useState(false);

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
          console.log('Valid session found for merge tool:', supabaseSession.user.id);

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
          console.log('No valid session found for merge tool');
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

  const handleFilesAccepted = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setMergedFile(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast.error('Please upload at least 2 PDF files to merge');
      return;
    }

    try {
      setIsMerging(true);
      setStorageUpdated(false);

      // Show a loading toast with a unique ID based on timestamp
      const toastId = `merge-toast-${Date.now()}`;
      toast.loading('Merging PDFs...', { id: toastId });

      console.log('Starting PDF merge process...');
      const merged = await mergePDFs(files);
      console.log(`Merge complete. Result size: ${merged.size} bytes`);

      setMergedFile(merged);

      // Record the file operation and update the user's storage usage
      if (user) {
        try {
          console.log(`Recording merge operation for user ${user.id} with file size: ${merged.size} bytes and ${files.length} files`);

          const operationResult = await recordFileOperation(
            user.id,
            'merge',
            merged.size,
            files.length,
            files.map(f => f.name).join(', '),
            'merged_document.pdf'
          );

          if (operationResult) {
            if (operationResult.is_valid) {
              console.log('Operation recorded successfully:', operationResult);
              setStorageUpdated(true);

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

                // Also force a refresh of the auth context
                window.dispatchEvent(new Event('visibilitychange'));

                // Set a flag in localStorage to ensure the dashboard gets updated
                localStorage.setItem('storage-usage-last-updated', Date.now().toString());
              }
            } else {
              // Operation was not valid (e.g., exceeded limits)
              console.warn('Operation validation failed:', operationResult.error_message);
              toast.error(operationResult.error_message || 'Failed to process files due to account limits');
            }
          } else {
            console.warn('Failed to record operation');
          }
        } catch (operationError) {
          console.error('Error recording operation:', operationError);
          // Continue even if operation recording fails
        }
      }

      // Dismiss the loading toast
      toast.dismiss(toastId);
      toast.success('PDFs merged successfully!');
    } catch (error) {
      console.error('Error merging PDFs:', error);

      // Dismiss the loading toast
      toast.dismiss(toastId);

      // Show a more detailed error message
      let errorMessage = 'Failed to merge PDFs. Please try again.';

      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);
        errorMessage = `Merge failed: ${error.message}`;
      }

      toast.error(errorMessage);
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownload = () => {
    if (!mergedFile) return;

    const url = URL.createObjectURL(mergedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged_document.pdf';
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

  // Show loading state
  if (authState === 'loading' && !showFallbackContent) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-primary-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Loading PDF Merge Tool...</h3>
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
            <p className="mt-1 text-sm text-gray-500">Please log in to access the PDF merge tool.</p>
            <div className="mt-6">
              <Button
                onClick={() => router.push('/login?redirect=/tools/merge')}
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
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Merge PDFs</h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Combine multiple PDF documents into a single file
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20">
            <div className="space-y-10">
              <div className="border-b border-gray-200 pb-10">
                <h3 className="text-base font-semibold leading-7 text-gray-900">1. Upload your PDFs</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Select multiple PDF files from your device to merge
                </p>
                <div className="mt-6">
                  <FileUpload
                    onFilesAccepted={handleFilesAccepted}
                    onFileSizeError={(message) => toast.error(message)}
                    maxSize={5 * 1024 * 1024} // 5MB default for free tier, will be adjusted based on subscription
                    maxFiles={10} // Allow up to 10 files
                    multiple={true}
                    toolType="merge"
                  />
                </div>
                {files.length > 0 && (
                  <div className="mt-4 text-sm text-gray-500">
                    {files.length} {files.length === 1 ? 'file' : 'files'} selected
                  </div>
                )}
              </div>

              {files.length > 0 && (
                <div className="border-b border-gray-200 pb-10">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">2. Merge your PDFs</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Click the button below to merge your PDF files
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={handleMerge}
                      isLoading={isMerging}
                      disabled={files.length < 2 || isMerging}
                      fullWidth
                    >
                      {isMerging ? 'Merging...' : 'Merge PDFs'}
                    </Button>
                  </div>
                </div>
              )}

              {mergedFile && (
                <div>
                  <h3 className="text-base font-semibold leading-7 text-gray-900">3. Download merged PDF</h3>
                  <div className="mt-6 rounded-lg bg-gray-50 px-6 py-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">Merge Complete</h4>
                        <div className="mt-2 text-sm text-gray-500">
                          <p>Merged {files.length} files into one PDF</p>
                          <p>File size: {formatFileSize(mergedFile.size)}</p>
                        </div>
                      </div>
                      <Button onClick={handleDownload} variant="primary">
                        Download
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
