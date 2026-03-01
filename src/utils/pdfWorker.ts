import { GlobalWorkerOptions, getDocument, version } from 'pdfjs-dist';

// Use a CDN for the worker to avoid complex build setup with Vite for now
GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

export { getDocument };
