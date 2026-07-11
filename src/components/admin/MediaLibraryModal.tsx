import { useState } from 'react';
import { X, Image as ImageIcon, Check } from 'lucide-react';
import { useMediaFiles } from '@/hooks/use-data';

interface MediaLibraryModalProps {
  currentValue?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}

/** Lets an admin pick a previously-uploaded photo instead of uploading a
 * new one, so the same image can be reused across products, services,
 * projects, and hero slides without re-uploading it each time. */
export function MediaLibraryModal({ currentValue, onSelect, onClose }: MediaLibraryModalProps) {
  const { files, loading } = useMediaFiles();
  const imageFiles = files.filter((f) => !f.file_type || f.file_type.startsWith('image/'));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Media Library
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading media...</div>
          ) : imageFiles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">No images in your Media Library yet.</p>
              <p className="text-xs text-gray-400">Upload a photo first, and it'll show up here for reuse next time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {imageFiles.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => onSelect(file.file_url)}
                  className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary-400 transition-all group"
                >
                  <img src={file.file_url} alt={file.alt_text || file.original_name || ''} className="w-full h-full object-cover" />
                  {currentValue === file.file_url && (
                    <div className="absolute inset-0 bg-primary-500/40 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                    <p className="text-white text-[10px] truncate">{file.original_name || file.filename}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Small hook-like helper for components that just need open/close state. */
export function useMediaLibraryModal() {
  const [open, setOpen] = useState(false);
  return { open, openModal: () => setOpen(true), closeModal: () => setOpen(false) };
}
