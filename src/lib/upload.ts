const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];

export function validateUpload(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File size must be under 5MB' };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'File type not allowed. Allowed: JPEG, PNG, WebP, GIF, SVG' };
  }
  return { valid: true };
}

export function validateUrlExtension(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
  return ext ? ALLOWED_EXTENSIONS.includes(ext) : false;
}

export { ALLOWED_TYPES, ALLOWED_EXTENSIONS, MAX_SIZE };
