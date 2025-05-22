import { PDFDocument } from 'pdf-lib';

/**
 * Compresses a PDF file by reducing its quality
 * @param file The PDF file to compress
 * @param quality The quality level (0-1)
 * @returns The compressed PDF as a Blob
 */
export const compressPDF = async (file: File, quality: number = 0.7): Promise<Blob> => {
  try {
    console.log(`Starting PDF compression with quality: ${quality}`);

    // Validate input
    if (!file || !(file instanceof File)) {
      console.error('Invalid file provided for compression:', file);
      throw new Error('Invalid file provided for compression');
    }

    // Log file details for debugging
    console.log(`Processing file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Read the file
    const arrayBuffer = await file.arrayBuffer();
    console.log(`File loaded into ArrayBuffer, size: ${arrayBuffer.byteLength} bytes`);

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    console.log(`PDF loaded successfully with ${pdfDoc.getPageCount()} pages`);

    // Create a new document with the same pages but compressed
    const compressedPdf = await PDFDocument.create();

    // Copy all pages from the original document
    const pages = await compressedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    console.log(`Copied ${pages.length} pages to new document`);

    // Add all pages to the new document
    pages.forEach(page => compressedPdf.addPage(page));

    // Apply compression based on quality parameter
    // Lower quality means higher compression
    const compressionFactor = 1 - quality; // Invert quality to get compression level

    // Save with compression options
    const compressedBytes = await compressedPdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      compress: true,
      // Additional compression options based on quality
      objectCompressionLevel: Math.max(1, Math.floor(9 * compressionFactor)), // 1-9 scale
    });

    console.log(`Compression complete. Original size: ${arrayBuffer.byteLength}, Compressed size: ${compressedBytes.length}`);

    // Create and return the compressed PDF as a Blob
    return new Blob([compressedBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error compressing PDF:', error);
    // Provide more detailed error information
    if (error instanceof Error) {
      throw new Error(`Failed to compress PDF: ${error.message}`);
    } else {
      throw new Error('Failed to compress PDF: Unknown error');
    }
  }
};

/**
 * Merges multiple PDF files into a single PDF
 * @param files Array of PDF files to merge
 * @returns The merged PDF as a Blob
 */
export const mergePDFs = async (files: File[]): Promise<Blob> => {
  try {
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();
    return new Blob([mergedBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error merging PDFs:', error);
    throw new Error('Failed to merge PDFs');
  }
};

/**
 * Splits a PDF file into multiple PDFs based on page ranges
 * @param file The PDF file to split
 * @param ranges Array of page ranges to extract (1-based indices)
 * @returns Array of split PDFs as Blobs
 */
export const splitPDF = async (
  file: File,
  ranges: { start: number; end: number }[]
): Promise<Blob[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();

    const splitPdfs: Blob[] = [];

    for (const range of ranges) {
      // Adjust for 0-based indexing
      const start = Math.max(0, range.start - 1);
      const end = Math.min(totalPages - 1, range.end - 1);

      if (start <= end) {
        const newPdf = await PDFDocument.create();
        const pageIndices = Array.from(
          { length: end - start + 1 },
          (_, i) => start + i
        );

        const pages = await newPdf.copyPages(pdfDoc, pageIndices);
        pages.forEach(page => newPdf.addPage(page));

        const pdfBytes = await newPdf.save();
        splitPdfs.push(new Blob([pdfBytes], { type: 'application/pdf' }));
      }
    }

    return splitPdfs;
  } catch (error) {
    console.error('Error splitting PDF:', error);
    throw new Error('Failed to split PDF');
  }
};

/**
 * Extracts specific pages from a PDF
 * @param file The PDF file
 * @param pageNumbers Array of page numbers to extract (1-based)
 * @returns The new PDF with only the specified pages
 */
export const extractPages = async (file: File, pageNumbers: number[]): Promise<Blob> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();

    // Convert to 0-based indices and filter valid pages
    const pageIndices = pageNumbers
      .map(num => num - 1)
      .filter(idx => idx >= 0 && idx < totalPages);

    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(pdfDoc, pageIndices);
    pages.forEach(page => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error extracting pages:', error);
    throw new Error('Failed to extract pages from PDF');
  }
};
