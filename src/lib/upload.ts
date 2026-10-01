import { supabase } from '@/lib/supabase';

// Must stay aligned with the `images` storage bucket (allowed_mime_types, 10 MB limit).
// SVG is intentionally excluded: the bucket rejects it and inline SVG is an XSS risk.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB (bucket ceiling is 10MB)
const UPLOAD_TIMEOUT_MS = 45_000;

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];

export function validateUpload(file: File): { valid: boolean; error?: string } {
  if (file.size <= 0) {
    return { valid: false, error: 'The selected file is empty' };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File size must be under 5MB' };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'File type not allowed. Allowed: JPEG, PNG, WebP, GIF, AVIF' };
  }
  return { valid: true };
}

export function validateUrlExtension(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
  return ext ? ALLOWED_EXTENSIONS.includes(ext) : false;
}

function friendlyStorageError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('row-level security') || m.includes('not authorized') || m.includes('unauthorized') || m.includes('permission'))
    return 'You do not have permission to upload images. Ask an administrator to grant media/catalog upload access.';
  if (m.includes('mime') || m.includes('not supported'))
    return 'This file type is not accepted by storage. Use JPEG, PNG, WebP, GIF or AVIF.';
  if (m.includes('bucket not found'))
    return 'The "images" storage bucket does not exist. Apply the Supabase storage migrations.';
  if (m.includes('exceeded') || m.includes('too large') || m.includes('payload'))
    return 'The file is too large for storage.';
  if (m.includes('jwt') || m.includes('expired'))
    return 'Your session has expired. Sign in again and retry.';
  return `Upload failed: ${message}`;
}

/**
 * Upload an image to the public `images` bucket and return its public URL.
 * Throws an Error with an actionable message on any failure. It never falls back to
 * embedding image bytes (base64) in the database, which previously made saves hang
 * and hid real storage/permission failures.
 */
export async function uploadImageToStorage(
  file: File,
  folder: string,
  cacheControl = '31536000'
): Promise<{ url: string; path: string }> {
  const validation = validateUpload(file);
  if (!validation.valid) throw new Error(validation.error || 'Invalid file');

  const ext = file.name.split('.').pop()?.toLowerCase();
  const safeExt = ext && ALLOWED_EXTENSIONS.includes(ext) ? ext : file.type.split('/')[1] || 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${safeExt}`;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Upload timed out. Check your connection and try again.')),
      UPLOAD_TIMEOUT_MS
    );
  });

  try {
    const result = await Promise.race([
      supabase.storage.from('images').upload(path, file, { cacheControl, upsert: false, contentType: file.type }),
      timeout,
    ]);
    if (result.error) throw new Error(friendlyStorageError(result.error.message));
  } catch (err) {
    if (err instanceof Error && (err.message.startsWith('Upload') || err.message.startsWith('You ') || err.message.startsWith('This ') || err.message.startsWith('The ') || err.message.startsWith('Your '))) throw err;
    throw new Error(friendlyStorageError(err instanceof Error ? err.message : 'Unknown error'));
  } finally {
    if (timer) clearTimeout(timer);
  }

  const { data } = supabase.storage.from('images').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Upload succeeded but no public URL was returned.');
  return { url: data.publicUrl, path };
}

export { ALLOWED_TYPES, ALLOWED_EXTENSIONS, MAX_SIZE };
