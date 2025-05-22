'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileUpload } from '@/components/pdf/FileUpload';
import { Button } from '@/components/ui/Button';
import { splitPDF, extractPages } from '@/lib/pdf/pdfUtils';
import toast from 'react-hot-toast';

type SplitMode = 'range' | 'extract';

export default function SplitPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>('range');
  const [splitFiles, setSplitFiles] = useState<Blob[]>([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [pageCount, setPageCount] = useState<number>(0);
  
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
      
      if (splitMode === 'range') {
        // Validate ranges
        const validRanges = ranges.filter(range => 
          range.start > 0 && 
          range.end <= pageCount && 
          range.start <= range.end
        );
        
        if (validRanges.length === 0) {
          toast.error('Please provide valid page ranges');
          setIsSplitting(false);
          return;
        }
        
        const result = await splitPDF(file, validRanges);
        setSplitFiles(result);
      } else {
        // Extract pages mode
        if (selectedPages.length === 0) {
          toast.error('Please select at least one page to extract');
          setIsSplitting(false);
          return;
        }
        
        const result = await extractPages(file, selectedPages);
        setSplitFiles([result]);
      }
      
      toast.success('PDF split successfully!');
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
                    maxSize={100 * 1024 * 1024} // 100MB max for demo
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
