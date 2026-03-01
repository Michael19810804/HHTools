import { PDFDocument, PDFImage } from 'pdf-lib';

interface Signature {
  signature_data: string; // Base64 data URL
  position: {
    page: number; // 1-based index
    x: number;
    y: number;
  };
  field_id?: string;
}

export const generateSignedPdf = async (
  originalPdfBuffer: ArrayBuffer,
  signatures: Signature[]
): Promise<Uint8Array> => {
  // 1. Load the PDF document
  const pdfDoc = await PDFDocument.load(originalPdfBuffer);
  
  // 2. Embed signatures
  for (const sig of signatures) {
    if (!sig.signature_data) continue;

    // Extract base64 data (remove "data:image/png;base64," prefix)
    const base64Data = sig.signature_data.split(',')[1];
    if (!base64Data) continue;
    
    // Embed the PNG image
    // Note: react-signature-canvas usually produces PNGs
    let image: PDFImage;
    try {
        if (sig.signature_data.startsWith('data:image/jpeg') || sig.signature_data.startsWith('data:image/jpg')) {
             image = await pdfDoc.embedJpg(base64Data);
        } else {
             image = await pdfDoc.embedPng(base64Data);
        }
    } catch (e) {
        console.error("Failed to embed image", e);
        continue;
    }

    // 3. Get the page
    // pdf-lib pages are 0-indexed, but our data is 1-indexed (usually)
    // In Sign.tsx we use 1-based page numbers for display, so let's assume `position.page` is 1-based.
    const pageIndex = (sig.position.page || 1) - 1;
    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) continue;
    
    const page = pdfDoc.getPage(pageIndex);
    const { height } = page.getSize();

    // 4. Draw the image
    // UI coordinates are usually Top-Left (0,0)
    // PDF coordinates are Bottom-Left (0,0)
    // We assume the stored x,y are Top-Left coordinates from the UI layer
    // We need to convert Y: pdf_y = height - ui_y - image_height
    
    // Fixed size for signature or use stored width/height? 
    // In Sign.tsx we use fixed width/height for the field: width: 120, height: 60
    // But the signature image itself might be larger/smaller.
    // Ideally we should scale the image to fit the field box.
    // For now, let's use the standard field size we defined in Upload.tsx (120x60)
    // If we saved the field dimensions in the signature record, we could use that.
    // The `signatures` table has `position` JSONB.
    
    const dims = { width: 120, height: 60 }; // Default field size
    
    // Calculate PDF coordinates
    // PDF Y starts from bottom. 
    // The stored 'y' is the top of the signature box in UI pixels (from top).
    // So the bottom of the signature box in PDF coordinates is:
    // pdf_y = page_height - (ui_y + ui_height)
    // But pdf-lib drawImage 'y' is the bottom-left corner of the image.
    
    // Check if sig.position has x/y directly or inside a nested object?
    // In Sign.tsx: position: currentField ? { page: ..., x: ..., y: ... }
    // So sig.position.x is correct.
    
    const pdfX = sig.position.x;
    const pdfY = height - (sig.position.y + dims.height);

    page.drawImage(image, {
      x: pdfX,
      y: pdfY,
      width: dims.width,
      height: dims.height,
    });
  }

  // 5. Save the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};
