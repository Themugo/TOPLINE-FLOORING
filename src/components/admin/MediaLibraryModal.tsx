import { useState } from 'react';
import { X, Image as ImageIcon, Check, Search, Filter } from 'lucide-react';
import { useMediaFiles } from '@/hooks/use-data';
import { optimizeImageUrl, formatBytes } from '@/lib/image-compressor';

interface MediaLibraryModalProps {
  currentValue?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}

/**
 * Production-Grade Media Library Modal allowing reusable asset selection
 * with search, category filters, and WebP previews.
 */
export function MediaLibraryModal({ currentValue, onSelect, onClose }: MediaLibraryModalProps) {
  const { files, loading } = useMediaFiles();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');

  const categories = ['All', 'General', 'Products', 'Projects', 'Services', 'Hero Slides', 'Logos'];

  const filteredFiles = files.filter((f) => {
    const isImage = !f.file_type || f.file_type.startsWith('image/');
    if (!isImage) return false;

    if (category !== 'All' && f.category !== category) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = f.filename?.toLowerCase().includes(q) || f.original_name?.toLowerCase().includes(q);
      const matchAlt = f.alt_text?.toLowerCase().includes(q) || f.title?.toLowerCase().includes(q);
      return matchName || matchAlt;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary-500" /> Select Reusable Media Asset
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-800/40">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets by keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium dark:bg-gray-800 dark:text-white"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assets Grid */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading media library...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-1 font-semibold">No matching media assets found</p>
              <p className="text-xs text-gray-400">Try adjusting your search query or uploading new photos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {filteredFiles.map((file) => {
                const isSelected = currentValue === file.file_url;
                const optimizedUrl = optimizeImageUrl(file.file_url, 300);

                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => {
                      onSelect(file.file_url);
                      onClose();
                    }}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary-600 ring-2 ring-primary-500/20'
                        : 'border-transparent hover:border-primary-400'
                    }`}
                  >
                    <img
                      src={optimizedUrl}
                      alt={file.alt_text || file.original_name || 'Media asset'}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {isSelected && (
                      <div className="absolute inset-0 bg-primary-600/40 backdrop-blur-[1px] flex items-center justify-center">
                        <Check className="w-8 h-8 text-white bg-primary-600 p-1.5 rounded-full shadow-lg" />
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 text-left">
                      <p className="text-white text-[11px] font-semibold truncate">
                        {file.title || file.original_name || file.filename}
                      </p>
                      <p className="text-gray-300 text-[10px] truncate">{formatBytes(file.file_size || 0)}</p>
                    </div>
                  </button>
                );
              })}
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
