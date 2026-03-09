import { GlobalWorkerOptions, getDocument, version } from 'pdfjs-dist';

// Use Cloudflare cdnjs for global reliability (including China)
// Local bundling caused MIME type issues with Nginx reverse proxy
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;

export { getDocument };
