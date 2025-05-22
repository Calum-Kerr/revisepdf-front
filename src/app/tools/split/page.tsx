'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileUpload } from '@/components/pdf/FileUpload';
import { Button } from '@/components/ui/Button';
import { splitPDF, extractPages } from '@/lib/pdf/pdfUtils';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, recordFileOperation } from '@/lib/supabase/client';
import { ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

type SplitMode = 'range' | 'extract';

export default function SplitPDFPage() {
  const router = useRouter();
  const { user, profile, session, isLoading } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>('range');
  const [splitFiles, setSplitFiles] = useState<Blob[]>([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [pageCount, setPageCount] = useState<number>(0);

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
          console.log('Valid session found for split tool:', supabaseSession.user.id);

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
          console.log('No valid session found for split tool');
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

  // For range splitting
  const [ranges, setRanges] = useState<{ start: number; end: number }[]>([{ start: 1, end: 1 }]);

  // For page extraction
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageInput, setPageInput] = useState<string>('');

  const handleFilesAccepted = (files: File[]) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      setFile(selectedFile);
      setSplitFiles([]);

      // Simulate getting page count (in a real app, you'd use PDF.js to get this)
      // For demo purposes, we'll set a random page count between 5-20
      const randomPageCount = Math.floor(Math.random() * 16) + 5;
      setPageCount(randomPageCount);

      // Reset ranges and selected pages
      setRanges([{ start: 1, end: randomPageCount }]);
      setSelectedPages([]);
      setPageInput('');
    }
  };

  const addRange = () => {
    setRanges([...ranges, { start: 1, end: pageCount }]);
  };

  const removeRange = (index: number) => {
    const newRanges = [...ranges];
    newRanges.splice(index, 1);
    setRanges(newRanges);
  };

  const updateRange = (index: number, field: 'start' | 'end', value: number) => {
    const newRanges = [...ranges];
    newRanges[index][field] = value;
    setRanges(newRanges);
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const addPageSelection = () => {
    if (!pageInput.trim()) return;

    try {
      // Parse page input (e.g., "1,3-5,7" => [1,3,4,5,7])
      const pages: number[] = [];

      pageInput.split(',').forEach(part => {
        part = part.trim();
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          for (let i = start; i <= end; i++) {
            if (i > 0 && i <= pageCount && !pages.includes(i)) {
              pages.push(i);
            }
          }
        } else {
          const page = Number(part);
          if (page > 0 && page <= pageCount && !pages.includes(page)) {
            pages.push(page);
          }
        }
      });

      setSelectedPages([...new Set([...selectedPages, ...pages])].sort((a, b) => a - b));
      setPageInput('');
    } catch (error) {
      toast.error('Invalid page format. Use numbers and ranges (e.g., 1,3-5,7)');
    }
  };

  const removeSelectedPage = (page: number) => {
    setSelectedPages(selectedPages.filter(p => p !== page));
  };

  const handleSplit = async () => {
    if (!file) {
      toast.error('Please upload a PDF file first');
      return;
    }

    try {
      setIsSplitting(true);

      // Show a loading toast with a unique ID based on timestamp
      const toastId = `split-toast-${Date.now()}`;
      toast.loading(splitMode === 'range' ? 'Splitting PDF...' : 'Extracting pages...', { id: toastId });

      let result: Blob[] = [];

      if (splitMode === 'range') {
        // Validate ranges
        const validRanges = ranges.filter(range =>
          range.start > 0 &&
          range.end <= pageCount &&
          range.start <= range.end
        );

        if (validRanges.length === 0) {
          toast.dismiss(toastId);
          toast.error('Please provide valid page ranges');
          setIsSplitting(false);
          return;
        }

        result = await splitPDF(file, validRanges);
        setSplitFiles(result);
      } else {
        // Extract pages mode
        if (selectedPages.length === 0) {
          toast.dismiss(toastId);
          toast.error('Please select at least one page to extract');
          setIsSplitting(false);
          return;
        }

        const extractedPdf = await extractPages(file, selectedPages);
        result = [extractedPdf];
        setSplitFiles(result);
      }

      // Record the file operation and update the user's storage usage
      if (user && result.length > 0) {
        try {
          // Calculate total size of all split files
          const totalSize = result.reduce((sum, file) => sum + file.size, 0);
          console.log(`Recording split operation for user ${user.id} with total file size: ${totalSize} bytes`);

          const operationResult = await recordFileOperation(
            user.id,
            'split',
            totalSize,
            result.length, // Number of files created
            file.name,
            splitMode === 'range' ? 'split_files.pdf' : 'extracted_pages.pdf'
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
      toast.success(splitMode === 'range' ? 'PDF split successfully!' : 'Pages extracted successfully!');
    } catch (error) {
      console.error('Error splitting PDF:', error);
      toast.error('Failed to split PDF. Please try again.');
    } finally {
      setIsSplitting(false);
    }
  };

  const handleDownload = (index: number) => {
    if (!splitFiles[index]) return;

    const url = URL.createObjectURL(splitFiles[index]);
    const a = document.createElement('a');
    a.href = url;

    if (splitMode === 'range') {
      a.download = `split_${index + 1}_${file?.name || 'document.pdf'}`;
    } else {
      a.download = `extracted_pages_${file?.name || 'document.pdf'}`;
    }

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
            <h3 className="mt-4 text-lg font-medium text-gray-900">Loading PDF Split Tool...</h3>
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
            <p className="mt-1 text-sm text-gray-500">Please log in to access the PDF split tool.</p>
            <div className="mt-6">
              <Button
                onClick={() => router.push('/login?redirect=/tools/split')}
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
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Split PDF</h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Extract pages or split a PDF into multiple files
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20">
            <div className="space-y-10">
              <div className="border-b border-gray-200 pb-10">
                <h3 className="text-base font-semibold leading-7 text-gray-900">1. Upload your PDF</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Select a PDF file from your device to split
                </p>
                <div className="mt-6">
                  <FileUpload
                    onFilesAccepted={handleFilesAccepted}
                    onFileSizeError={(message) => toast.error(message)}
                    maxSize={5 * 1024 * 1024} // 5MB default for free tier, will be adjusted based on subscription
                    toolType="split"
                  />
                </div>
                {file && pageCount > 0 && (
                  <div className="mt-4 text-sm text-gray-500">
                    Document has {pageCount} pages
                  </div>
                )}
              </div>

              {file && pageCount > 0 && (
                <div className="border-b border-gray-200 pb-10">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">2. Choose split method</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Select how you want to split your PDF
                  </p>
                  <div className="mt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        type="button"
                        onClick={() => setSplitMode('range')}
                        className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ${
                          splitMode === 'range'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Split by Page Ranges
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitMode('extract')}
                        className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ${
                          splitMode === 'extract'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Extract Specific Pages
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {file && pageCount > 0 && splitMode === 'range' && (
                <div className="border-b border-gray-200 pb-10">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">3. Define page ranges</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Specify the page ranges to split your PDF into separate files
                  </p>
                  <div className="mt-6 space-y-4">
                    {ranges.map((range, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">From</span>
                          <input
                            type="number"
                            min={1}
                            max={pageCount}
                            value={range.start}
                            onChange={(e) => updateRange(index, 'start', parseInt(e.target.value) || 1)}
                            className="block w-16 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">To</span>
                          <input
                            type="number"
                            min={1}
                            max={pageCount}
                            value={range.end}
                            onChange={(e) => updateRange(index, 'end', parseInt(e.target.value) || 1)}
                            className="block w-16 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                          />
                        </div>
                        {ranges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRange(index)}
                            className="rounded-full p-1 text-gray-400 hover:text-gray-500"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={addRange}
                      leftIcon={
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      }
                    >
                      Add Range
                    </Button>
                  </div>
                </div>
              )}

              {file && pageCount > 0 && splitMode === 'extract' && (
                <div className="border-b border-gray-200 pb-10">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">3. Select pages to extract</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Specify which pages you want to extract into a new PDF
                  </p>
                  <div className="mt-6 space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pageInput}
                        onChange={handlePageInputChange}
                        placeholder="e.g., 1,3-5,7"
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                      />
                      <Button variant="outline" onClick={addPageSelection}>
                        Add
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500">
                      Enter page numbers separated by commas. Use hyphens for ranges (e.g., 1,3-5,7).
                    </div>

                    {selectedPages.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700">Selected Pages:</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedPages.map(page => (
                            <span
                              key={page}
                              className="inline-flex items-center rounded-full bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700"
                            >
                              Page {page}
                              <button
                                type="button"
                                onClick={() => removeSelectedPage(page)}
                                className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-primary-400 hover:bg-primary-200 hover:text-primary-500 focus:bg-primary-500 focus:text-white focus:outline-none"
                              >
                                <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                                  <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {file && pageCount > 0 && (splitMode === 'range' && ranges.length > 0 || splitMode === 'extract' && selectedPages.length > 0) && (
                <div className="border-b border-gray-200 pb-10">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">
                    {splitMode === 'range' ? '4. Split your PDF' : '4. Extract pages from your PDF'}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    {splitMode === 'range'
                      ? 'Click the button below to split your PDF into separate files'
                      : 'Click the button below to extract the selected pages into a new PDF'}
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={handleSplit}
                      isLoading={isSplitting}
                      disabled={isSplitting}
                      fullWidth
                    >
                      {isSplitting
                        ? (splitMode === 'range' ? 'Splitting...' : 'Extracting...')
                        : (splitMode === 'range' ? 'Split PDF' : 'Extract Pages')}
                    </Button>
                  </div>
                </div>
              )}

              {splitFiles.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold leading-7 text-gray-900">
                    {splitMode === 'range' ? '5. Download split PDFs' : '5. Download extracted PDF'}
                  </h3>
                  <div className="mt-6 rounded-lg bg-gray-50 px-6 py-8">
                    <div className="space-y-4">
                      {splitFiles.map((splitFile, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <h4 className="text-base font-semibold text-gray-900">
                              {splitMode === 'range'
                                ? `Split PDF ${index + 1} (Pages ${ranges[index]?.start}-${ranges[index]?.end})`
                                : 'Extracted Pages PDF'}
                            </h4>
                            <div className="mt-1 text-sm text-gray-500">
                              <p>File size: {formatFileSize(splitFile.size)}</p>
                            </div>
                          </div>
                          <Button onClick={() => handleDownload(index)} variant="primary">
                            Download
                          </Button>
                        </div>
                      ))}
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
