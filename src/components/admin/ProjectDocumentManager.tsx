import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  UploadCloud,
  Trash2,
  FileCheck,
  ShieldCheck,
  Award,
  ClipboardList,
  Eye,
  Download,
  X,
  Loader2,
  Search,
  Filter,
} from 'lucide-react';
import type { ProjectDocument, ProjectDocumentType, Project } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const DOCUMENT_BUCKET = 'private-documents';
const MAX_FILE_BYTES = 10 * 1024 * 1024; // matches bucket file_size_limit
const SIGNED_URL_TTL_SECONDS = 60;

// Must match the bucket allowed_mime_types and the project_documents.mime_type check.
const EXTENSION_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
const ALLOWED_MIME = new Set(Object.values(EXTENSION_MIME));

function resolveMime(file: File): string {
  if (file.type && ALLOWED_MIME.has(file.type)) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME[ext] ?? file.type;
}

function sanitiseFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+/, '')
    .slice(-120);
  return cleaned || 'document';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}

interface ProjectDocumentManagerProps {
  project: Project;
  onUpdateProjectDocuments?: (updatedDocs: ProjectDocument[]) => void;
}

export function ProjectDocumentManager({
  project,
  onUpdateProjectDocuments,
}: ProjectDocumentManagerProps) {
  const { toast } = useToast();

  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [uploaderNames, setUploaderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<ProjectDocumentType>('contract');
  const [docNotes, setDocNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as ProjectDocument[];
      setDocuments(rows);
      onUpdateProjectDocuments?.(rows);

      // Best-effort uploader names; RLS decides what is visible.
      const ids = Array.from(new Set(rows.map((r) => r.uploaded_by).filter((v): v is string => !!v)));
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('staff_profiles')
          .select('user_id, display_name')
          .in('user_id', ids);
        const map: Record<string, string> = {};
        (profiles ?? []).forEach((p: { user_id: string; display_name: string | null }) => {
          if (p.display_name) map[p.user_id] = p.display_name;
        });
        setUploaderNames(map);
      }
    } catch (err) {
      setDocuments([]);
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const resetForm = () => {
    setDocName('');
    setDocType('contract');
    setDocNotes('');
    setSelectedFile(null);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({ title: 'No file selected', description: 'Choose a file to upload.', variant: 'destructive' });
      return;
    }
    const mime = resolveMime(selectedFile);
    if (!ALLOWED_MIME.has(mime)) {
      toast({
        title: 'Unsupported file type',
        description: 'Allowed: PDF, JPG, PNG, WEBP, TXT, DOCX, XLSX.',
        variant: 'destructive',
      });
      return;
    }
    if (selectedFile.size <= 0 || selectedFile.size > MAX_FILE_BYTES) {
      toast({
        title: 'File size not allowed',
        description: `Files must be between 1 byte and ${formatBytes(MAX_FILE_BYTES)}.`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    let uploadedPath: string | null = null;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('You must be signed in to upload documents.');

      const displayName = docName.trim() || selectedFile.name;
      const storagePath = `projects/${project.id}/${crypto.randomUUID()}-${sanitiseFileName(selectedFile.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(storagePath, selectedFile, { contentType: mime, upsert: false });
      if (uploadError) throw uploadError;
      uploadedPath = storagePath;

      const { error: insertError } = await supabase.from('project_documents').insert({
        project_id: project.id,
        file_name: displayName,
        doc_type: docType,
        storage_bucket: DOCUMENT_BUCKET,
        storage_path: storagePath,
        mime_type: mime,
        file_size_bytes: selectedFile.size,
        notes: docNotes.trim() || null,
        uploaded_by: userData.user.id,
      });
      if (insertError) throw insertError;
      uploadedPath = null; // metadata saved; nothing to roll back

      toast({ title: 'Document uploaded', description: `"${displayName}" is now attached to ${project.title}.` });
      setIsUploadModalOpen(false);
      resetForm();
      await loadDocuments();
    } catch (err) {
      // Roll back the orphaned object if metadata could not be saved.
      if (uploadedPath) {
        await supabase.storage.from(DOCUMENT_BUCKET).remove([uploadedPath]);
      }
      toast({ title: 'Upload failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openDocument = async (doc: ProjectDocument, download: boolean) => {
    setBusyDocId(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS, download ? { download: doc.file_name } : undefined);
      if (error || !data?.signedUrl) throw error ?? new Error('Could not create a secure link.');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast({ title: 'Could not open document', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusyDocId(null);
    }
  };

  const handleDeleteDocument = async (doc: ProjectDocument) => {
    if (!window.confirm(`Delete "${doc.file_name}"? This permanently removes the file.`)) return;
    setBusyDocId(doc.id);
    try {
      // Storage first: if the row delete then fails the row remains and delete can be retried
      // (removing an already-missing object is a no-op), so no invisible orphan is left behind.
      const { error: storageError } = await supabase.storage.from(DOCUMENT_BUCKET).remove([doc.storage_path]);
      if (storageError) throw storageError;
      const { error: rowError } = await supabase.from('project_documents').delete().eq('id', doc.id);
      if (rowError) throw rowError;
      toast({ title: 'Document deleted', description: `"${doc.file_name}" was removed from this project.` });
      await loadDocuments();
    } catch (err) {
      toast({ title: 'Delete failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusyDocId(null);
    }
  };

  const filteredDocs = documents.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchesType = filterType === 'all' || d.doc_type === filterType;
    const matchesSearch = d.file_name.toLowerCase().includes(q) || (d.notes ?? '').toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const getDocBadge = (type: ProjectDocument['doc_type']) => {
    switch (type) {
      case 'contract':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <FileText className="w-3 h-3 text-blue-600" /> Contract Agreement
          </span>
        );
      case 'site_survey':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <ClipboardList className="w-3 h-3 text-amber-600" /> Site Audit / Survey
          </span>
        );
      case 'completion_certificate':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Award className="w-3 h-3 text-emerald-600" /> Completion Signoff
          </span>
        );
      case 'safety_compliance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3 h-3 text-purple-600" /> Safety & Compliance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <FileCheck className="w-3 h-3 text-gray-500" /> Supporting Document
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-4">
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              Project Document Vault
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-full">
                {documents.length} {documents.length === 1 ? 'File' : 'Files'}
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              Contracts, site surveys and sign-off certificates, stored privately and opened via short-lived secure links.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <UploadCloud className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search files or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 mr-1" />
          {[
            { id: 'all', label: 'All Docs' },
            { id: 'contract', label: 'Contracts' },
            { id: 'site_survey', label: 'Surveys' },
            { id: 'completion_certificate', label: 'Certificates' },
            { id: 'safety_compliance', label: 'Safety' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                filterType === tab.id
                  ? 'bg-indigo-500 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents List Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading documents...
        </div>
      ) : loadError ? (
        <div className="p-6 text-center border border-rose-200 rounded-2xl bg-rose-50 space-y-2">
          <p className="text-xs font-semibold text-rose-700">Could not load documents</p>
          <p className="text-[11px] text-rose-600">{loadError}</p>
          <button
            onClick={() => void loadDocuments()}
            className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-600">
            {documents.length === 0 ? 'No documents uploaded yet' : 'No matching documents found'}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Upload contracts, site surveys or certificates to associate them with this project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-3.5 bg-gray-50/70 hover:bg-white border border-gray-200 hover:border-indigo-300 rounded-2xl transition-all shadow-2xs group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  {getDocBadge(doc.doc_type)}
                  <span className="text-[10px] font-mono text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-100">
                    {formatBytes(doc.file_size_bytes)}
                  </span>
                </div>

                <h4 className="font-bold text-xs text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5 line-clamp-1">
                  <FileText className="w-4 h-4 text-red-500 shrink-0" />
                  {doc.file_name}
                </h4>

                {doc.notes && (
                  <p className="text-[11px] text-gray-600 mt-1.5 line-clamp-2 italic bg-white p-2 rounded-lg border border-gray-100">
                    "{doc.notes}"
                  </p>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-gray-400">
                <span>
                  Uploaded {new Date(doc.created_at).toLocaleDateString()}
                  {doc.uploaded_by ? ` by ${uploaderNames[doc.uploaded_by] ?? 'staff'}` : ''}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => void openDocument(doc, false)}
                    disabled={busyDocId === doc.id}
                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px] disabled:opacity-50"
                    title="Open Document"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button
                    onClick={() => void openDocument(doc, true)}
                    disabled={busyDocId === doc.id}
                    className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px] disabled:opacity-50"
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  <button
                    onClick={() => void handleDeleteDocument(doc)}
                    disabled={busyDocId === doc.id}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-indigo-600" />
                Attach Project Document
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleFileUpload(e)} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Document Type *
                </label>
                <select
                  value={docType}
                  onChange={(e) =>
                    setDocType(e.target.value as ProjectDocumentType)
                  }
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="contract">PDF Contract / Agreement</option>
                  <option value="site_survey">Site Inspection / Substrate Audit</option>
                  <option value="completion_certificate">Completion Certificate / Signoff</option>
                  <option value="safety_compliance">Safety & Environmental Clearance</option>
                  <option value="other">General Technical Report</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Display Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="Defaults to the file name"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  File Attachment *
                </label>
                <div className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer bg-gray-50/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="doc-file-input"
                  />
                  <label htmlFor="doc-file-input" className="cursor-pointer space-y-1 block">
                    <UploadCloud className="w-6 h-6 text-indigo-500 mx-auto" />
                    {selectedFile ? (
                      <p className="font-bold text-indigo-700 text-xs">{selectedFile.name}</p>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-700">Click to choose file or drag & drop</p>
                        <p className="text-[10px] text-gray-400">PDF, DOCX, XLSX, TXT, JPG, PNG, WEBP up to 10MB</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Notes & Key Terms
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Scope includes 5-year warranty against substrate delamination..."
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedFile}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
