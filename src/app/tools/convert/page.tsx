'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileUpload } from '@/components/pdf/FileUpload';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, recordFileOperation } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

type ConversionType = 'pdf-to-image' | 'image-to-pdf' | 'pdf-to-word' | 'word-to-pdf';

interface ConversionOption {
  id: ConversionType;
  title: string;
  description: string;
  acceptedFiles: Record<string, string[]>;
  outputFormat: string;
}

export default function ConvertPDFPage() {
  const router = useRouter();
  const { user, profile, session, isLoading } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [convertedFile, setConvertedFile] = useState<Blob | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionType, setConversionType] = useState<ConversionType>('pdf-to-image');

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
          console.log('Valid session found for convert tool:', supabaseSession.user.id);

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
          console.log('No valid session found for convert tool');
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

  const conversionOptions: ConversionOption[] = [
    {
      id: 'pdf-to-image',
      title: 'PDF to Image',
      description: 'Convert PDF pages to image files (JPG, PNG)',
      acceptedFiles: { 'application/pdf': ['.pdf'] },
      outputFormat: 'JPG',
    },
    {
      id: 'image-to-pdf',
      title: 'Image to PDF',
      description: 'Convert image files to PDF format',
      acceptedFiles: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif'] },
      outputFormat: 'PDF',
    },
    {
      id: 'pdf-to-word',
      title: 'PDF to Word',
      description: 'Convert PDF documents to editable Word files',
      acceptedFiles: { 'application/pdf': ['.pdf'] },
      outputFormat: 'DOCX',
    },
    {
      id: 'word-to-pdf',
      title: 'Word to PDF',
      description: 'Convert Word documents to PDF format',
      acceptedFiles: {
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'application/msword': ['.doc']
      },
      outputFormat: 'PDF',
    },
  ];

  const currentOption = conversionOptions.find(option => option.id === conversionType) || conversionOptions[0];

  const handleFilesAccepted = (files: File[]) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      setFile(selectedFile);
      setConvertedFile(null);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      toast.error('Please upload a file first');
      return;
    }

    try {
      setIsConverting(true);

      // Show a loading toast with a unique ID based on timestamp
      const toastId = `convert-toast-${Date.now()}`;
      toast.loading(`Converting to ${currentOption.outputFormat}...`, { id: toastId });

      // Simulate conversion process with a timeout
      // In a real app, you would use appropriate libraries for each conversion type
      await new Promise(resolve => setTimeout(resolve, 2000));

      // For demo purposes, we'll just create a mock blob
      // In a real app, this would be the actual converted file
      const mockBlob = new Blob([await file.arrayBuffer()], { type: 'application/octet-stream' });
      setConvertedFile(mockBlob);

      // Record the file operation and update the user's storage usage
      if (user) {
        try {
          console.log(`Recording conversion operation for user ${user.id} with file size: ${mockBlob.size} bytes`);

          // Get output filename based on conversion type
          let outputFilename = file.name.split('.')[0];
          switch (conversionType) {
            case 'pdf-to-image':
              outputFilename += '.jpg';
              break;
            case 'image-to-pdf':
              outputFilename += '.pdf';
              break;
            case 'pdf-to-word':
              outputFilename += '.docx';
              break;
            case 'word-to-pdf':
              outputFilename += '.pdf';
              break;
          }

          const operationResult = await recordFileOperation(
            user.id,
            'convert',
            mockBlob.size,
            1, // Single file
            file.name,
            outputFilename
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

      // Dismiss the loading toast
      toast.dismiss(toastId);
      toast.success(`File converted to ${currentOption.outputFormat} successfully!`);
    } catch (error) {
      console.error('Error converting file:', error);
      toast.error('Failed to convert file. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!convertedFile || !file) return;

    const url = URL.createObjectURL(convertedFile);
    const a = document.createElement('a');
    a.href = url;

    // Set appropriate file extension based on conversion type
    let filename = file.name.split('.')[0];
    switch (conversionType) {
      case 'pdf-to-image':
        filename += '.jpg';
        break;
      case 'image-to-pdf':
        filename += '.pdf';
        break;
      case 'pdf-to-word':
        filename += '.docx';
        break;
      case 'word-to-pdf':
        filename += '.pdf';
        break;
    }

    a.download = filename;
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">Loading File Conversion Tool...</h3>
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
            <p className="mt-1 text-sm text-gray-500">Please log in to access the file conversion tool.</p>
            <div className="mt-6">
              <Button
                onClick={() => router.push('/login?redirect=/tools/convert')}
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
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Convert Files</h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Convert between PDF and other file formats
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20">
            <div className="space-y-10">
              <div className="border-b border-gray-200 pb-10">
                <h3 className="text-base font-semibold leading-7 text-gray-900">1. Select conversion type</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Choose the type of conversion you want to perform
                </p>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {conversionOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setConversionType(option.id)}
                      className={`cursor-pointer rounded-lg border p-4 ${
                        conversionType === option.id
                          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <h4 className="text-base font-semibold text-gray-900">{option.title}</h4>
                      <p className="mt-1 text-sm text-gray-500">{option.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-b border-gray-200 pb-10">
                <h3 className="text-base font-semibold leading-7 text-gray-900">2. Upload your file</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Select a file to convert
                </p>
                <div className="mt-6">
                  <FileUpload
                    onFilesAccepted={handleFilesAccepted}
                    onFileSizeError={(message) => toast.error(message)}
                    maxSize={5 * 1024 * 1024} // 5MB default for free tier, will be adjusted based on subscription
                    accept={currentOption.acceptedFiles}
                    toolType="convert"
                  />
                </div>
                {file && (
                  <div className="mt-4 text-sm text-gray-500">
                    File size: {formatFileSize(file.size)}
                  </div>
                )}
              </div>

              {file && (
                <div className="border-b border-gray-200 pb-10">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">3. Convert your file</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Click the button below to convert your file
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={handleConvert}
                      isLoading={isConverting}
                      disabled={!file || isConverting}
                      fullWidth
                    >
                      {isConverting ? 'Converting...' : `Convert to ${currentOption.outputFormat}`}
                    </Button>
                  </div>
                </div>
              )}

              {convertedFile && (
                <div>
                  <h3 className="text-base font-semibold leading-7 text-gray-900">4. Download converted file</h3>
                  <div className="mt-6 rounded-lg bg-gray-50 px-6 py-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">Conversion Complete</h4>
                        <div className="mt-2 text-sm text-gray-500">
                          <p>Converted to {currentOption.outputFormat} format</p>
                          <p>File size: {formatFileSize(convertedFile.size)}</p>
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
