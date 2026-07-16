import { useState, useEffect, useCallback, useRef } from 'react';
import { FolderOpen, Upload, Search, Image, File, Trash2, FolderPlus, ChevronRight, X, Check, Move, Pencil } from 'lucide-react';
import { AdminLayout } from '@/pages/admin/dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { MediaFolder, MediaFile } from '@/lib/types';

const STORAGE_BUCKET_ERROR = 'Storage bucket not accessible. In Supabase Dashboard → SQL Editor, paste and run the contents of supabase/setup_storage.sql. Then reload this page.';

export default function AdminMediaLibrary() {
  return (
    <AdminLayout title="Media Library">
      <MediaLibraryContent />
    </AdminLayout>
  );
}

function MediaLibraryContent() {
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
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

  const fetchFiles = useCallback(async (folderId: string | null) => {
    setLoading(true);
    let query = supabase
      .from('media_files')
      .select('*')
      .order('created_at', { ascending: false });

    if (folderId) {
      query = query.eq('folder_id', folderId);
    } else {
      query = query.is('folder_id', null);
    }

    if (searchQuery) {
      query = query.or(`filename.ilike.%${searchQuery}%,original_name.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (!error && data) {
      setFiles(data);
    }
    setLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchFiles(currentFolder);
  }, [currentFolder, fetchFiles]);

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    const { error } = await supabase
      .from('media_files')
      .delete()
      .eq('id', fileId);

    if (error) {
      toast({ type: 'error', message: 'Failed to delete file' });
    } else {
      toast({ type: 'success', message: 'File deleted' });
      fetchFiles(currentFolder);
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    }
  };

  const handleUpdateFileDetails = async (fileId: string, title: string, altText: string) => {
    const { error } = await supabase
      .from('media_files')
      .update({ title: title || null, alt_text: altText || null })
      .eq('id', fileId);

    if (error) {
      toast({ type: 'error', message: 'Failed to save details' });
      return false;
    }
    toast({ type: 'success', message: 'Photo details saved' });
    fetchFiles(currentFolder);
    return true;
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    if (!confirm(`Delete ${selectedFiles.length} selected files?`)) return;

    const { error } = await supabase
      .from('media_files')
      .delete()
      .in('id', selectedFiles);

    if (error) {
      toast({ type: 'error', message: 'Failed to delete files' });
    } else {
      toast({ type: 'success', message: `${selectedFiles.length} files deleted` });
      setSelectedFiles([]);
      fetchFiles(currentFolder);
    }
  };

  const toggleSelect = (fileId: string) => {
    if (selectedFiles.includes(fileId)) {
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    } else {
      setSelectedFiles([...selectedFiles, fileId]);
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-8 h-8 text-gray-400" />;
    if (fileType.startsWith('image/')) return <Image className="w-8 h-8 text-primary-500" />;
    return <File className="w-8 h-8 text-gray-400" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'All Files' }];
    if (currentFolder && folders.length > 0) {
      const folder = folders.find(f => f.id === currentFolder);
      if (folder) {
        crumbs.push({ id: folder.id, name: folder.name });
      }
    }
    return crumbs;
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>

        <button
          onClick={() => setShowNewFolderModal(true)}
          className="btn-secondary flex items-center gap-2"
        >
          <FolderPlus className="w-4 h-4" />
          New Folder
        </button>

        {selectedFiles.length > 0 && (
          <>
            <button
              onClick={() => setShowMoveModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Move className="w-4 h-4" />
              Move ({selectedFiles.length})
            </button>
            <button
              onClick={handleBulkDelete}
              className="btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedFiles.length})
            </button>
          </>
        )}
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {getBreadcrumbs().map((crumb, index) => (
          <span key={crumb.id || 'root'} className="flex items-center">
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
            <button
              onClick={() => setCurrentFolder(crumb.id)}
              className={`hover:text-primary-600 ${
                currentFolder === crumb.id ? 'text-primary-600 font-medium' : 'text-gray-600'
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Folders */}
      {folders.filter(f => f.parent_id === currentFolder || (!currentFolder && !f.parent_id)).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {folders
            .filter(f => f.parent_id === currentFolder || (!currentFolder && !f.parent_id))
            .map((folder) => (
              <button
                key={folder.id}
                onClick={() => setCurrentFolder(folder.id)}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-center"
              >
                <FolderOpen className="w-10 h-10 text-primary-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900 truncate">{folder.name}</p>
              </button>
            ))}
        </div>
      )}

      {/* Files Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-12">
          <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No files found</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
          >
            Upload your first file
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className={`relative group bg-white border rounded-lg overflow-hidden ${
                selectedFiles.includes(file.id) ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-200'
              }`}
            >
              <div
                className="cursor-pointer"
                onClick={() => toggleSelect(file.id)}
              >
                {file.file_type?.startsWith('image/') ? (
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={file.file_url}
                      alt={file.alt_text || file.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-50 flex items-center justify-center">
                    {getFileIcon(file.file_type)}
                  </div>
                )}
              </div>

              <div className="p-2">
                <p className="text-xs text-gray-900 font-medium truncate" title={file.original_name || file.filename}>
                  {file.title || file.original_name || file.filename}
                </p>
                <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFile(file);
                  }}
                  className="p-1.5 bg-white text-navy-700 rounded hover:text-primary-600 shadow-sm"
                  title="Edit title, alt text & story"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(file.id);
                  }}
                  className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Selection indicator */}
              <div className="absolute top-2 left-2">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selectedFiles.includes(file.id)
                    ? 'bg-primary-500 border-primary-500'
                    : 'bg-white border-gray-300 opacity-0 group-hover:opacity-100'
                }`}>
                  {selectedFiles.includes(file.id) && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </div>
          ))}
        </div>
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

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          folders={folders}
          currentFolder={currentFolder}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchFiles(currentFolder);
          }}
        />
      )}

      {/* Move Modal */}
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

      {editingFile && (
        <EditFileModal
          file={editingFile}
          onClose={() => setEditingFile(null)}
          onSave={handleUpdateFileDetails}
        />
      )}
    </div>
  );
}

function EditFileModal({
  file,
  onClose,
  onSave,
}: {
  file: MediaFile;
  onClose: () => void;
  onSave: (fileId: string, title: string, altText: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(file.title || '');
  const [altText, setAltText] = useState(file.alt_text || '');
  const [saving, setSaving] = useState(false);
  const isImage = file.file_type?.startsWith('image/');

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(file.id, title, altText);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg text-gray-900">Photo Details</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {isImage && (
          <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
            <img src={file.file_url} alt={file.alt_text || ''} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder={file.original_name || file.filename}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description / Story
            </label>
            <textarea
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="input min-h-[90px]"
              placeholder="What's the story behind this photo? e.g. 'Epoxy floor installation for a warehouse client in Industrial Area, day 2 of 3.' This also doubles as the image's alt text for accessibility and search."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewFolderModal({
  folders,
  parentId,
  onClose,
  onSuccess
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
    const { error } = await supabase
      .from('media_folders')
      .insert({
        name: name.trim(),
        parent_id: parentId,
        display_order: folders.filter(f => f.parent_id === parentId).length
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Folder</h2>
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mb-4"
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

function UploadModal({
  folders,
  currentFolder,
  onClose,
  onSuccess
}: {
  folders: MediaFolder[];
  currentFolder: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(currentFolder);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast({ type: 'error', message: 'Please select at least one file' });
      return;
    }

    setUploading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filesToInsert: any[] = [];

    for (const file of selectedFiles) {
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const storagePath = `media-library/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          if (/bucket not found/i.test(uploadError.message)) {
            throw new Error(STORAGE_BUCKET_ERROR);
          }
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(storagePath);

        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        const fileType = imageExts.includes(ext)
          ? `image/${ext === 'svg' ? 'svg+xml' : ext}`
          : file.type || 'application/octet-stream';

        filesToInsert.push({
          folder_id: selectedFolder,
          filename: storagePath.split('/').pop(),
          original_name: file.name,
          file_url: urlData.publicUrl,
          file_type: fileType,
          file_size: file.size,
          is_public: true,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (/bucket not found|Storage bucket/i.test(message)) {
          toast({ type: 'error', message: STORAGE_BUCKET_ERROR });
        } else {
          toast({ type: 'error', message: `Failed to upload ${file.name}` });
        }
      }
    }

    if (filesToInsert.length > 0) {
      const { error } = await supabase
        .from('media_files')
        .insert(filesToInsert);

      if (error) {
        toast({ type: 'error', message: 'Failed to save file records' });
      } else {
        toast({ type: 'success', message: `${filesToInsert.length} file(s) uploaded` });
        onSuccess();
      }
    }

    setUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upload Files</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleUpload}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
            <select
              value={selectedFolder || ''}
              onChange={(e) => setSelectedFolder(e.target.value || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Root (No Folder)</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Files</label>
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const dropped = Array.from(e.dataTransfer.files);
                setSelectedFiles([...selectedFiles, ...dropped]);
              }}
              className={`w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {uploading ? 'Uploading...' : 'Click to select or drag & drop files here'}
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP, GIF, SVG</p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Image className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))}
                      className="text-red-500 hover:text-red-600 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={uploading || selectedFiles.length === 0} className="btn-primary">
              {uploading ? 'Uploading...' : `Upload ${selectedFiles.length || ''} File${selectedFiles.length === 1 ? '' : 's'}`}
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
  onSuccess
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
    const { error } = await supabase
      .from('media_files')
      .update({ folder_id: targetFolder })
      .in('id', selectedFiles);

    setMoving(false);
    if (error) {
      toast({ type: 'error', message: 'Failed to move files' });
    } else {
      toast({ type: 'success', message: `${selectedFiles.length} file(s) moved` });
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Move Files</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Moving {selectedFiles.length} selected file(s)
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Destination Folder</label>
          <select
            value={targetFolder || ''}
            onChange={(e) => setTargetFolder(e.target.value || null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
            {moving ? 'Moving...' : 'Move Files'}
          </button>
        </div>
      </div>
    </div>
  );
}
