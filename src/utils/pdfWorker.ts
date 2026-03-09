import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';

// Import worker as a URL so Vite can bundle it correctly
// This ensures the worker is served from our own server, not a blocked CDN
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

export { getDocument };
