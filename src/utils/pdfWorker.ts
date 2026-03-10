import { GlobalWorkerOptions, getDocument as pdfjsGetDocument, version } from 'pdfjs-dist';

// Use local worker for maximum reliability (bypassing CDN issues in China)
// The worker file is manually copied to public/pdf.worker.mjs
GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;

// Use local cMaps (copied to public/cmaps/)
const CMAP_URL = `/cmaps/`;
const CMAP_PACKED = true;

/**
 * Wrapper around pdfjsLib.getDocument to ensure consistent configuration (cMapUrl, etc.)
 */
export const getDocument = (src: any) => {
  let params: any = src;
  
  // Handle different input types (ArrayBuffer, String URL, etc.) by standardizing to object param
  // If it's not already an object with config, assume it's data or url
  if (src instanceof ArrayBuffer || typeof src === 'string' || Array.isArray(src) || (src && src.buffer instanceof ArrayBuffer)) {
    // If it looks like data or url, we treat it as the source
    // But getDocument(url) is valid. getDocument({ url }) is also valid.
    // pdfjsGetDocument handles overloading, but we want to inject options.
    
    if (typeof src === 'string') {
        params = { url: src };
    } else {
        params = { data: src };
    }
  } else {
    // It's likely already a DocumentInitParameters object
    params = { ...src };
  }

  // Inject standard options if not present
  if (!params.cMapUrl) {
    params.cMapUrl = CMAP_URL;
  }
  if (params.cMapPacked === undefined) {
    params.cMapPacked = CMAP_PACKED;
  }

  return pdfjsGetDocument(params);
};

export { version, GlobalWorkerOptions };
