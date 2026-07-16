import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MediaLibraryModal } from '@/components/admin/MediaLibraryModal';
import { validateUpload } from '@/lib/upload';

const STORAGE_BUCKET_ERROR = 'Storage bucket not accessible. In Supabase Dashboard → SQL Editor, paste and run the contents of supabase/setup_storage.sql. Then reload this page.';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  label = 'Image',
  folder = 'general',
  className = '',
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  async function uploadFile(file: File) {
    setError(null);

    const validation = validateUpload(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        if (/bucket not found/i.test(uploadError.message)) {
          throw new Error(STORAGE_BUCKET_ERROR);
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      onChange(urlData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleRemove() {
    onChange('');
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      {value ? (
        <div className="relative group">
          <div className="w-full h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Replace image'}
            </button>
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
            >
              <FolderOpen className="w-3.5 h-3.5" /> Browse Library
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`w-full rounded-lg border-2 border-dashed transition-colors ${
            dragOver
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          } ${uploading ? 'pointer-events-none' : ''}`}
        >
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="h-32 flex flex-col items-center justify-center cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="w-7 h-7 text-primary-500 animate-spin mb-2" />
                <p className="text-sm text-gray-500">Uploading...</p>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">
                  Click to upload or drag & drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG, WebP up to 5MB
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="w-full py-2 text-xs text-gray-500 hover:text-primary-600 font-medium border-t border-gray-200 flex items-center justify-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5" /> Or browse Media Library
          </button>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        onChange={handleFileSelect}
        className="hidden"
      />

      {libraryOpen && (
        <MediaLibraryModal
          currentValue={value}
          onSelect={(url) => { onChange(url); setLibraryOpen(false); }}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  );
}

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  folder?: string;
  className?: string;
}

export function MultiImageUpload({
  value,
  onChange,
  label = 'Images',
  folder = 'gallery',
  className = '',
}: MultiImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFiles(files: FileList) {
    setError(null);
    setUploading(true);

    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const validation = validateUpload(file);
        if (!validation.valid) {
          setError(validation.error || 'Invalid file');
          setUploading(false);
          return;
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          if (/bucket not found/i.test(uploadError.message)) {
            throw new Error(STORAGE_BUCKET_ERROR);
          }
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);

        urls.push(urlData.publicUrl);
      }
      onChange([...value, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {value.map((url, i) => (
          <div key={i} className="relative group">
            <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors shadow opacity-0 group-hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          ) : (
            <>
              <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Add</span>
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) uploadFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}
