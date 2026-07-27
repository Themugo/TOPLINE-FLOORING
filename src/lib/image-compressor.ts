/**
 * Utility for client-side image resizing, downscaling, and compression.
 * Automatically converts heavy JPEG/PNG images into standardized, high-performance
 * WebP files before uploading to cloud storage.
 */

export interface CompressionOptions {
  maxDimension?: number; // Maximum width or height in pixels (e.g. 1920)
  quality?: number; // Quality ratio between 0.1 and 1.0 (e.g. 0.82)
  outputFormat?: 'image/webp' | 'image/jpeg' | 'image/png';
}

export interface CompressionResult {
  file: File;
  originalSize: number; // in bytes
  compressedSize: number; // in bytes
  originalWidth: number;
  originalHeight: number;
  compressedWidth: number;
  compressedHeight: number;
  savingsPercent: number; // e.g. 78.5 (%)
  format: string;
  hash?: string;
  webpDataUrl?: string;
  responsiveSizes?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxDimension: 1920,
  quality: 0.82,
  outputFormat: 'image/webp',
};

/**
 * Computes a simple SHA-256 or MD5-like string hash from a file or blob for duplicate detection
 */
export async function computeFileHash(fileOrBlob: File | Blob): Promise<string> {
  try {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback hash for browsers without crypto.subtle
    const size = fileOrBlob.size;
    const name = (fileOrBlob as File).name || 'file';
    return `hash-${size}-${name.replace(/[^a-zA-Z0-9]/g, '')}`;
  }
}

/**
 * Optimizes external image URLs (e.g., Unsplash) by appending WebP / sizing parameters
 */
export function optimizeImageUrl(url: string, width = 800, quality = 80): string {
  if (!url) return '';
  if (url.includes('images.unsplash.com')) {
    const cleanUrl = url.split('?')[0];
    return `${cleanUrl}?auto=format&fit=crop&w=${width}&q=${quality}&fm=webp`;
  }
  return url;
}

/**
 * Generates responsive size data URLs for different breakpoints
 */
export async function generateResponsiveVariants(
  file: File
): Promise<{ thumbnail?: string; small?: string; medium?: string; large?: string }> {
  const sizes = {
    thumbnail: 150,
    small: 400,
    medium: 800,
    large: 1200,
  };

  const variants: Record<string, string> = {};

  for (const [key, dim] of Object.entries(sizes)) {
    try {
      const res = await compressAndResizeImage(file, { maxDimension: dim, quality: 0.8, outputFormat: 'image/webp' });
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(res.file);
      });
      variants[key] = dataUrl;
    } catch {
      // skip individual variant on error
    }
  }

  return variants;
}

/**
 * Checks if a file is a duplicate of existing media files in the database / store
 */
export function detectDuplicateMedia(
  fileHash: string,
  fileName: string,
  fileSize: number,
  existingFiles: { id: string; filename: string; original_name?: string | null; file_size?: number | null; hash?: string | null; file_url: string }[]
): { isDuplicate: boolean; duplicateOf?: (typeof existingFiles)[0] } {
  const matchByHash = existingFiles.find((f) => f.hash && f.hash === fileHash);
  if (matchByHash) return { isDuplicate: true, duplicateOf: matchByHash };

  const matchBySizeAndName = existingFiles.find(
    (f) => f.file_size === fileSize && (f.filename === fileName || f.original_name === fileName)
  );
  if (matchBySizeAndName) return { isDuplicate: true, duplicateOf: matchBySizeAndName };

  return { isDuplicate: false };
}

/**
 * Resizes and compresses an image file in the browser canvas.
 */
export async function compressAndResizeImage(
  file: File,
  options?: CompressionOptions
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip SVGs and GIFs (preserve vector & animated content)
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      originalWidth: 0,
      originalHeight: 0,
      compressedWidth: 0,
      compressedHeight: 0,
      savingsPercent: 0,
      format: file.type,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to decode image content'));

      img.onload = () => {
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        let targetWidth = originalWidth;
        let targetHeight = originalHeight;

        // Calculate proportional scale if dimensions exceed maxDimension
        const maxDim = opts.maxDimension || 1920;
        if (originalWidth > maxDim || originalHeight > maxDim) {
          if (originalWidth > originalHeight) {
            targetWidth = maxDim;
            targetHeight = Math.round((originalHeight * maxDim) / originalWidth);
          } else {
            targetHeight = maxDim;
            targetWidth = Math.round((originalWidth * maxDim) / originalHeight);
          }
        }

        // Create HTML5 canvas for high-quality downsampling
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        // Configure smoothing algorithm
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw and scale image onto canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Determine output MIME type (fallback to JPEG if WebP unsupported)
        const mimeType = opts.outputFormat || 'image/webp';
        
        // Export compressed blob from canvas
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback to JPEG if WebP export fails
              canvas.toBlob(
                (fallbackBlob) => {
                  if (!fallbackBlob) {
                    reject(new Error('Canvas compression export failed'));
                    return;
                  }
                  finalizeResult(fallbackBlob, 'image/jpeg', 'jpg');
                },
                'image/jpeg',
                opts.quality
              );
              return;
            }

            const ext = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : 'jpg';
            finalizeResult(blob, mimeType, ext);
          },
          mimeType,
          opts.quality
        );

        function finalizeResult(blob: Blob, actualMime: string, extension: string) {
          // Replace extension in filename
          const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const newFileName = `${nameWithoutExt}_opt.${extension}`;

          const compressedFile = new File([blob], newFileName, {
            type: actualMime,
            lastModified: Date.now(),
          });

          const savings = Math.max(
            0,
            Math.round(((file.size - compressedFile.size) / file.size) * 100)
          );

          resolve({
            file: compressedFile,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            originalWidth,
            originalHeight,
            compressedWidth: targetWidth,
            compressedHeight: targetHeight,
            savingsPercent: savings,
            format: actualMime,
          });
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes to readable human strings (e.g. 2.4 MB, 180 KB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
