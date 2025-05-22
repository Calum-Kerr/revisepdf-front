'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileUpload } from '@/components/pdf/FileUpload';
import { Button } from '@/components/ui/Button';
import { compressPDF } from '@/lib/pdf/pdfUtils';
import toast from 'react-hot-toast';

export default function CompressPDFPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<Blob | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);

  const handleFilesAccepted = (files: File[]) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      setFile(selectedFile);
      setOriginalSize(selectedFile.size);
      setCompressedFile(null);
      setCompressedSize(0);
    }
  };

  const handleCompress = async () => {
    if (!file) {
      toast.error('Please upload a PDF file first');
      return;
    }

    try {
      setIsCompressing(true);

      // Map compression level to quality value (0-1)
      const qualityMap = {
        low: 0.5,
        medium: 0.7,
        high: 0.9,
      };

      const compressed = await compressPDF(file, qualityMap[compressionLevel]);
      setCompressedFile(compressed);
      setCompressedSize(compressed.size);

      toast.success('PDF compressed successfully!');
    } catch (error) {
      console.error('Error compressing PDF:', error);
      toast.error('Failed to compress PDF. Please try again.');
    } finally {
      setIsCompressing(false);
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
                    maxSize={100 * 1024 * 1024} // 100MB max for demo
                    toolType="compress"
                  />
                </div>
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
