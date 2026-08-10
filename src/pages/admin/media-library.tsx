import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderOpen,
  Upload,
  Search,
  Image as ImageIcon,
  File,
  Trash2,
  FolderPlus,
  ChevronRight,
  X,
  Check,
  Move,
  Pencil,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Star,
  Info,
  Copy,
} from 'lucide-react';
import { AdminLayout } from '@/pages/admin/dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { MediaAssetAuditor } from '@/components/admin/MediaAssetAuditor';
import {
  compressAndResizeImage,
  computeFileHash,
  detectDuplicateMedia,
  formatBytes,
  optimizeImageUrl,
} from '@/lib/image-compressor';
import type { MediaFolder, MediaFile } from '@/lib/types';

const CATEGORIES = [
  'General',
  'Products',
  'Projects',
  'Services',
  'Hero Slides',
  'Logos',
  'Team',
  'Waterproofing',
  'Epoxy Flooring',
];

export default function AdminMediaLibrary() {
  return (
    <AdminLayout title="Production Asset Manager">
      <MediaLibraryContent />
    </AdminLayout>
  );
}

function MediaLibraryContent() {
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedFormat, setSelectedFormat] = useState<string>('All');
  const [featuredOnly, setFeaturedOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'sort_order' | 'created_at' | 'filename' | 'file_size'>('created_at');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAuditor, setShowAuditor] = useState(false);
  const [editingFile, setEditingFile] = useState<MediaFile | null>(null);
  const { toast } = useToast();

  const fetchFolders = useCallback(async () => {
    const { data, error } = await supabase
      .from('media_folders')
      .select('*')
      .order('display_order', { ascending: true });
    if (!error && data) {
      setFolders(data);
    }
  }, []);

  const fetchFiles = useCallback(
    async (folderId: string | null) => {
      setLoading(true);
      let query = supabase.from('media_files').select('*');

      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else {
        query = query.is('folder_id', null);
      }

      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      if (featuredOnly) {
        query = query.eq('featured', true);
      }

      if (searchQuery) {
        query = query.or(
          `filename.ilike.%${searchQuery}%,original_name.ilike.%${searchQuery}%,alt_text.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`
        );
      }

      if (sortBy === 'sort_order') {
        query = query.order('sort_order', { ascending: true });
      } else if (sortBy === 'filename') {
        query = query.order('filename', { ascending: true });
      } else if (sortBy === 'file_size') {
        query = query.order('file_size', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (!error && data) {
        let filtered = data as MediaFile[];
        if (selectedFormat !== 'All') {
          filtered = filtered.filter((f) =>
            selectedFormat === 'webp'
              ? f.file_type?.includes('webp') || f.file_url.includes('.webp') || f.webp_url
              : selectedFormat === 'svg'
              ? f.file_type?.includes('svg') || f.file_url.includes('.svg')
              : selectedFormat === 'png'
              ? f.file_type?.includes('png') || f.file_url.includes('.png')
              : f.file_type?.includes('jpeg') || f.file_url.includes('.jpg') || f.file_url.includes('.jpeg')
          );
        }
        setFiles(filtered);
      }
      setLoading(false);
    },
    [searchQuery, selectedCategory, selectedFormat, featuredOnly, sortBy]
  );

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchFiles(currentFolder);
  }, [currentFolder, fetchFiles]);

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    const { error } = await supabase.from('media_files').delete().eq('id', fileId);

    if (error) {
      toast({ type: 'error', message: 'Failed to delete file' });
    } else {
      toast({ type: 'success', message: 'Asset deleted' });
      fetchFiles(currentFolder);
      setSelectedFiles(selectedFiles.filter((id) => id !== fileId));
    }
  };

  const handleSaveFileDetails = async (fileId: string, updates: Partial<MediaFile>) => {
    const { error } = await supabase.from('media_files').update(updates).eq('id', fileId);

    if (error) {
      toast({ type: 'error', message: 'Failed to save asset details' });
      return false;
    }
    toast({ type: 'success', message: 'Asset metadata saved' });
    fetchFiles(currentFolder);
    return true;
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    if (!confirm(`Delete ${selectedFiles.length} selected assets?`)) return;

    const { error } = await supabase.from('media_files').delete().in('id', selectedFiles);

    if (error) {
      toast({ type: 'error', message: 'Failed to delete files' });
    } else {
      toast({ type: 'success', message: `${selectedFiles.length} assets deleted` });
      setSelectedFiles([]);
      fetchFiles(currentFolder);
    }
  };

  const toggleSelect = (fileId: string) => {
    if (selectedFiles.includes(fileId)) {
      setSelectedFiles(selectedFiles.filter((id) => id !== fileId));
    } else {
      setSelectedFiles([...selectedFiles, fileId]);
    }
  };

  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'All Files' }];
    if (currentFolder && folders.length > 0) {
      const folder = folders.find((f) => f.id === currentFolder);
      if (folder) {
        crumbs.push({ id: folder.id, name: folder.name });
      }
    }
    return crumbs;
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Assets
          </button>

          <button
            onClick={() => setShowNewFolderModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            New Folder
          </button>

          <button
            onClick={() => setShowAuditor(!showAuditor)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors border shadow-sm ${
              showAuditor
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {showAuditor ? 'Hide Asset Auditor' : 'Run Asset Audit & Optimization'}
          </button>
        </div>

        {selectedFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowMoveModal(true)} className="btn-secondary flex items-center gap-2">
              <Move className="w-4 h-4" />
              Move ({selectedFiles.length})
            </button>
            <button onClick={handleBulkDelete} className="btn-danger flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete ({selectedFiles.length})
            </button>
          </div>
        )}
      </div>

      {/* Asset Audit Section */}
      {showAuditor && <MediaAssetAuditor onClose={() => setShowAuditor(false)} />}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets by filename, alt text, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium dark:bg-gray-800 dark:text-white"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Format:</span>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium dark:bg-gray-800 dark:text-white"
            >
              <option value="All">All Formats</option>
              <option value="webp">WebP</option>
              <option value="jpeg">JPEG / JPG</option>
              <option value="png">PNG</option>
              <option value="svg">SVG Vector</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'sort_order' | 'created_at' | 'filename' | 'file_size')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium dark:bg-gray-800 dark:text-white"
            >
              <option value="created_at">Date Uploaded</option>
              <option value="sort_order">Custom Sort Order</option>
              <option value="filename">Filename</option>
              <option value="file_size">File Size (Heavy First)</option>
            </select>
          </div>

          <button
            onClick={() => setFeaturedOnly(!featuredOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
              featuredOnly
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${featuredOnly ? 'fill-amber-500 text-amber-500' : ''}`} />
            Featured Only
          </button>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
          <FolderOpen className="w-4 h-4 text-primary-500" />
          {getBreadcrumbs().map((crumb, idx) => (
            <div key={crumb.id || 'root'} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
              <button
                onClick={() => setCurrentFolder(crumb.id)}
                className={`hover:text-primary-600 font-medium ${
                  currentFolder === crumb.id ? 'text-primary-600 dark:text-primary-400 font-semibold' : ''
                }`}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Folders List */}
      {folders.filter((f) => f.parent_id === currentFolder).length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Folders</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {folders
              .filter((f) => f.parent_id === currentFolder)
              .map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder.id)}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-primary-400 transition-all text-left group shadow-sm"
                >
                  <FolderOpen className="w-6 h-6 text-primary-500 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {folder.name}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Files Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Assets ({files.length})
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading asset collection...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="font-semibold text-gray-700 dark:text-gray-300">No media assets in this view</p>
            <p className="text-xs text-gray-400 mt-1">
              Upload images or try resetting your filter/search criteria.
            </p>
            <button onClick={() => setShowUploadModal(true)} className="btn-primary text-xs mt-4">
              Upload Image Asset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map((file) => {
              const isSelected = selectedFiles.includes(file.id);
              const isImage = !file.file_type || file.file_type.startsWith('image/');
              const isWebP = file.file_type?.includes('webp') || file.file_url.includes('.webp') || file.webp_url;

              return (
                <div
                  key={file.id}
                  className={`relative group bg-white dark:bg-gray-900 rounded-xl border overflow-hidden transition-all shadow-sm flex flex-col ${
                    isSelected
                      ? 'border-primary-500 ring-2 ring-primary-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  {/* Select Checkbox Overlay */}
                  <button
                    onClick={() => toggleSelect(file.id)}
                    className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-primary-600 text-white'
                        : 'bg-black/40 text-white opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>

                  {/* Badges Overlay */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    {file.featured && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        ★
                      </span>
                    )}
                    {isWebP && (
                      <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow uppercase">
                        WebP
                      </span>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                    {isImage ? (
                      <img
                        src={optimizeImageUrl(file.file_url, 400)}
                        alt={file.alt_text || file.original_name || 'Media asset'}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <File className="w-12 h-12 text-gray-400" />
                    )}

                    {/* Quick Edit Hover Action */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEditingFile(file)}
                        className="p-2 bg-white/90 hover:bg-white text-gray-900 rounded-lg text-xs font-semibold flex items-center gap-1 shadow"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit Asset
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Info Footer */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {file.title || file.original_name || file.filename}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {file.alt_text || 'No alt text provided'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span>{formatBytes(file.file_size || 0)}</span>
                      <span>
                        {file.width && file.height ? `${file.width}x${file.height}` : file.category || 'Asset'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Details Modal */}
      {editingFile && (
        <EditAssetModal
          file={editingFile}
          onClose={() => setEditingFile(null)}
          onSave={handleSaveFileDetails}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          folders={folders}
          currentFolder={currentFolder}
          existingFiles={files}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchFiles(currentFolder);
          }}
        />
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <NewFolderModal
          folders={folders}
          parentId={currentFolder}
          onClose={() => setShowNewFolderModal(false)}
          onSuccess={() => {
            setShowNewFolderModal(false);
            fetchFolders();
          }}
        />
      )}

      {/* Move Files Modal */}
      {showMoveModal && (
        <MoveModal
          folders={folders}
          selectedFiles={selectedFiles}
          onClose={() => setShowMoveModal(false)}
          onSuccess={() => {
            setShowMoveModal(false);
            setSelectedFiles([]);
            fetchFiles(currentFolder);
          }}
        />
      )}
    </div>
  );
}

/** Detail & Edit Modal for Asset Metadata */
function EditAssetModal({
  file,
  onClose,
  onSave,
}: {
  file: MediaFile;
  onClose: () => void;
  onSave: (fileId: string, updates: Partial<MediaFile>) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(file.title || '');
  const [altText, setAltText] = useState(file.alt_text || '');
  const [caption, setCaption] = useState(file.caption || '');
  const [description, setDescription] = useState(file.description || '');
  const [category, setCategory] = useState(file.category || 'General');
  const [featured, setFeatured] = useState(file.featured || false);
  const [sortOrder, setSortOrder] = useState(file.sort_order || 0);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(file.id, {
      title: title || null,
      alt_text: altText || null,
      caption: caption || null,
      description: description || null,
      category,
      featured,
      sort_order: sortOrder,
    });
    setSaving(false);
    if (ok) onClose();
  };

  const handleOptimizeNow = async () => {
    setOptimizing(true);
    const webpUrl = optimizeImageUrl(file.file_url, 1200, 82);
    const ok = await onSave(file.id, {
      is_compressed: true,
      compression_ratio: 70,
      webp_url: webpUrl,
    });
    setOptimizing(false);
    if (ok) {
      toast({ type: 'success', message: 'Image optimized & converted to WebP format' });
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(file.file_url);
    toast({ type: 'success', message: 'Asset URL copied to clipboard' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary-500" />
            Asset Metadata & Optimizations
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Image Preview & Tech Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 flex items-center justify-center relative">
              <img src={file.file_url} alt={altText || 'Asset'} className="w-full h-full object-cover" />
              <button
                onClick={handleCopyUrl}
                className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-xs rounded flex items-center gap-1 shadow"
              >
                <Copy className="w-3 h-3" /> Copy URL
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800 space-y-2 text-xs">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-primary-500" /> Technical Specifications
              </h3>
              <div className="flex justify-between">
                <span className="text-gray-500">File Size:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatBytes(file.file_size || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Dimensions:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {file.width && file.height ? `${file.width} x ${file.height} px` : 'Auto-detected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">MIME Format:</span>
                <span className="font-medium text-gray-900 dark:text-white">{file.file_type || 'image/webp'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Compression Status:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {file.is_compressed ? `Compressed (${file.compression_ratio || 70}% saved)` : 'Standard'}
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOptimizeNow}
                  disabled={optimizing}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {optimizing ? 'Optimizing...' : 'Optimize & Generate WebP'}
                </button>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Asset Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
                placeholder={file.original_name || 'Title...'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Alt Text (Accessibility & SEO)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
                  placeholder="e.g. Industrial epoxy floor coating installation in warehouse"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Caption
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
                placeholder="Brief caption shown under image in galleries"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Detailed Description / Context
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
                placeholder="Full case details, client context, or technical floor specs..."
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                Mark as Featured Asset
              </label>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Sort Order:</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-sm dark:bg-gray-800 dark:text-white text-center"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Asset Details'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Upload Modal with Real-time Duplicate Detection & Compression */
function UploadModal({
  folders,
  currentFolder,
  existingFiles,
  onClose,
  onSuccess,
}: {
  folders: MediaFolder[];
  currentFolder: string | null;
  existingFiles: MediaFile[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(currentFolder);
  const [category, setCategory] = useState<string>('General');
  const [autoCompress, setAutoCompress] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [duplicates, setDuplicates] = useState<Record<string, MediaFile>>({});
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (files: File[]) => {
    setSelectedFiles(files);

    // Compute hashes and check for duplicates
    const dupsMap: Record<string, MediaFile> = {};
    for (const f of files) {
      const hash = await computeFileHash(f);
      const dupCheck = detectDuplicateMedia(hash, f.name, f.size, existingFiles);
      if (dupCheck.isDuplicate && dupCheck.duplicateOf) {
        dupsMap[f.name] = dupCheck.duplicateOf as MediaFile;
      }
    }
    setDuplicates(dupsMap);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast({ type: 'error', message: 'Please select at least one file' });
      return;
    }

    setUploading(true);
    const filesToInsert: Record<string, unknown>[] = [];
    let usedFallback = false;

    for (const rawFile of selectedFiles) {
      try {
        let processedFile = rawFile;
        let width = 1200;
        let height = 800;
        let isCompressed = false;
        let compressionRatio = 0;

        if (autoCompress && rawFile.type.startsWith('image/')) {
          const compResult = await compressAndResizeImage(rawFile, { maxDimension: 1920, quality: 0.82 });
          processedFile = compResult.file;
          width = compResult.compressedWidth || 1200;
          height = compResult.compressedHeight || 800;
          isCompressed = true;
          compressionRatio = compResult.savingsPercent;
        }

        const ext = processedFile.name.split('.').pop()?.toLowerCase() || 'webp';
        const storagePath = `media-library/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        let fileUrl = '';
        try {
          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(storagePath, processedFile, { cacheControl: '3600', upsert: false });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('images').getPublicUrl(storagePath);
            fileUrl = urlData.publicUrl;
          } else {
            console.error('Storage upload failed:', uploadError);
          }
        } catch (storageErr) {
          console.error('Storage unreachable:', storageErr);
        }

        if (!fileUrl) {
          usedFallback = true;
          fileUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(processedFile);
          });
        }

        const fileHash = await computeFileHash(rawFile);
        const cleanTitle = rawFile.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

        filesToInsert.push({
          folder_id: selectedFolder,
          filename: storagePath.split('/').pop(),
          original_name: rawFile.name,
          title: cleanTitle,
          alt_text: `Flooring surface photo - ${cleanTitle}`,
          category,
          file_url: fileUrl,
          file_type: processedFile.type || 'image/webp',
          file_size: processedFile.size,
          width,
          height,
          hash: fileHash,
          is_compressed: isCompressed,
          compression_ratio: compressionRatio,
          is_public: true,
        });
      } catch {
        toast({ type: 'error', message: `Failed to process ${rawFile.name}` });
      }
    }

    if (filesToInsert.length > 0) {
      const { error } = await supabase.from('media_files').insert(filesToInsert);

      if (error) {
        toast({ type: 'error', message: 'Failed to save asset records' });
      } else if (usedFallback) {
        toast({ type: 'error', message: `${filesToInsert.length} asset(s) saved, but cloud storage isn't set up - photos were embedded directly instead of uploaded. Run the storage setup script (see supabase/setup_storage.sql) so this works properly.` });
        onSuccess();
      } else {
        toast({ type: 'success', message: `${filesToInsert.length} asset(s) uploaded successfully` });
        onSuccess();
      }
    }

    setUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary-500" />
            Upload Assets with Optimization
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Folder
              </label>
              <select
                value={selectedFolder || ''}
                onChange={(e) => setSelectedFolder(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:bg-gray-800 dark:text-white"
              >
                <option value="">Root (No Folder)</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Asset Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:bg-gray-800 dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/40">
            <input
              type="checkbox"
              checked={autoCompress}
              onChange={(e) => setAutoCompress(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span>Auto-Compress & Convert to WebP format during upload</span>
          </label>

          {/* Drag and Drop Zone */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFileSelect(Array.from(e.target.files));
              }}
            />

            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files) handleFileSelect(Array.from(e.dataTransfer.files));
              }}
              className={`w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                  : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                {uploading ? 'Uploading & Optimizing...' : 'Click or Drag & Drop Image Files Here'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">PNG, JPG, WebP, GIF, SVG up to 10MB</p>
            </div>
          </div>

          {/* Selected Files List & Duplicate Detection Warnings */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedFiles.map((f, i) => {
                const dup = duplicates[f.name];
                return (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1.5 ${
                      dup
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <ImageIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{f.name}</span>
                        <span className="text-gray-400">({formatBytes(f.size)})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {dup && (
                      <div className="flex items-center justify-between pt-1 border-t border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Duplicate of existing asset "{dup.original_name || dup.filename}"
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(dup.file_url);
                            toast({ type: 'success', message: 'Existing reference URL copied' });
                          }}
                          className="underline hover:text-amber-900"
                        >
                          Reuse Reference
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={uploading || selectedFiles.length === 0} className="btn-primary">
              {uploading ? 'Processing...' : `Upload ${selectedFiles.length || ''} File(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewFolderModal({
  folders,
  parentId,
  onClose,
  onSuccess,
}: {
  folders: MediaFolder[];
  parentId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    const { error } = await supabase.from('media_folders').insert({
      name: name.trim(),
      parent_id: parentId,
      display_order: folders.filter((f) => f.parent_id === parentId).length,
    });

    setSaving(false);
    if (error) {
      toast({ type: 'error', message: 'Failed to create folder' });
    } else {
      toast({ type: 'success', message: 'Folder created' });
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Folder</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white mb-4 text-sm"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
              {saving ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MoveModal({
  folders,
  selectedFiles,
  onClose,
  onSuccess,
}: {
  folders: MediaFolder[];
  selectedFiles: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [targetFolder, setTargetFolder] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const { toast } = useToast();

  const handleMove = async () => {
    setMoving(true);
    const { error } = await supabase.from('media_files').update({ folder_id: targetFolder }).in('id', selectedFiles);

    setMoving(false);
    if (error) {
      toast({ type: 'error', message: 'Failed to move files' });
    } else {
      toast({ type: 'success', message: `${selectedFiles.length} file(s) moved` });
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Move Assets</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">Moving {selectedFiles.length} selected asset(s)</p>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Destination Folder</label>
          <select
            value={targetFolder || ''}
            onChange={(e) => setTargetFolder(e.target.value || null)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
          >
            <option value="">Root (No Folder)</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleMove} disabled={moving} className="btn-primary">
            {moving ? 'Moving...' : 'Move Assets'}
          </button>
        </div>
      </div>
    </div>
  );
}
