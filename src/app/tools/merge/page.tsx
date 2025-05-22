'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileUpload } from '@/components/pdf/FileUpload';
import { Button } from '@/components/ui/Button';
import { mergePDFs } from '@/lib/pdf/pdfUtils';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserStorageUsage } from '@/lib/supabase/client';

export default function MergePDFsPage() {
  const { user, profile } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [mergedFile, setMergedFile] = useState<Blob | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [storageUpdated, setStorageUpdated] = useState(false);

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

      // Update the user's storage usage
      if (user) {
        try {
          console.log(`Updating storage usage for user ${user.id} with file size: ${merged.size} bytes`);
          const updatedProfile = await updateUserStorageUsage(user.id, merged.size);

          if (updatedProfile) {
            console.log('Storage usage updated successfully:', updatedProfile);
            setStorageUpdated(true);

            // Update the profile in context
            if (typeof window !== 'undefined') {
              // Trigger a refresh of the auth context
              const event = new CustomEvent('storage-usage-updated', {
                detail: { profile: updatedProfile }
              });
              window.dispatchEvent(event);
            }
          } else {
            console.warn('Failed to update storage usage');
          }
        } catch (storageError) {
          console.error('Error updating storage usage:', storageError);
          // Continue even if storage update fails
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
