import { GlobalWorkerOptions, getDocument, version } from 'pdfjs-dist';

// Use a CDN for the worker to avoid complex build setup with Vite for now
// Switch to jsDelivr (with China CDN acceleration) for better performance
GlobalWorkerOptions.workerSrc = `//cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

export { getDocument };
