import * as pdfjsLib from 'pdfjs-dist';

// Use a CDN for the worker to avoid complex build setup with Vite for now
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const getDocument = pdfjsLib.getDocument;
