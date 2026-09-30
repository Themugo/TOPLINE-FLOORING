import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText, UploadCloud, Trash2, FileCheck, ShieldCheck, Award, ClipboardList,
  Eye, Download, X, CheckCircle2, Search, Filter,
} from 'lucide-react';
import type { ProjectDocument, Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface ProjectDocumentManagerProps {
  project: Project;
  onUpdateProjectDocuments?: (updatedDocs: ProjectDocument[]) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]);

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180);

export function ProjectDocumentManager({ project, onUpdateProjectDocuments }: ProjectDocumentManagerProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDoc, setViewingDoc] = useState<ProjectDocument | null>(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<ProjectDocument['doc_type']>('contract');
  const [docNotes, setDocNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const refreshDocuments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_documents')
      .select('id, project_id, document_name, document_type, storage_path, mime_type, file_size_bytes, notes, uploaded_by, created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });

    if (error) {
      setLoading(false);
      toast({ title: 'Could not load project documents', description: error.message, variant: 'destructive' });
      return;
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const mapped: ProjectDocument[] = rows.map((row) => ({
      id: String(row.id),
      project_id: String(row.project_id),
      name: String(row.document_name),
      doc_type: row.document_type as ProjectDocument['doc_type'],
      file_url: '',
      storage_path: String(row.storage_path),
      mime_type: String(row.mime_type),
      file_size_bytes: Number(row.file_size_bytes),
      file_size: formatBytes(Number(row.file_size_bytes)),
      uploaded_at: String(row.created_at),
      uploaded_by: String(row.uploaded_by ?? 'Admin / Manager'),
      uploaded_by_id: row.uploaded_by ? String(row.uploaded_by) : null,
      notes: String(row.notes ?? ''),
    }));
    setDocuments(mapped);
    onUpdateProjectDocuments?.(mapped);
    setLoading(false);
  }, [onUpdateProjectDocuments, project.id, toast]);

  useEffect(() => { void refreshDocuments(); }, [refreshDocuments]);

  const getSignedUrl = useCallback(async (doc: ProjectDocument) => {
    const { data, error } = await supabase.storage.from('private-documents').createSignedUrl(doc.storage_path, 3600);
    if (error || !data?.signedUrl) throw error ?? new Error('Could not create a secure document URL.');
    return data.signedUrl;
  }, []);

  const handleOpenDocument = async (doc: ProjectDocument) => {
    try {
      const signedUrl = await getSignedUrl(doc);
      setViewingDoc({ ...doc, file_url: signedUrl });
    } catch (error) {
      toast({ title: 'Document unavailable', description: error instanceof Error ? error.message : 'Could not open the document.', variant: 'destructive' });
    }
  };

  const handleDownload = async (doc: ProjectDocument) => {
    try {
      const signedUrl = await getSignedUrl(doc);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({ title: 'Download unavailable', description: error instanceof Error ? error.message : 'Could not create a secure download link.', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setDocName(''); setDocNotes(''); setSelectedFile(null); setDocType('contract');
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({ title: 'File required', description: 'Select the document you want to upload.', variant: 'destructive' });
      return;
    }
    if (selectedFile.size <= 0 || selectedFile.size > MAX_FILE_SIZE) {
      toast({ title: 'File size not allowed', description: 'Project documents must be smaller than 10 MB.', variant: 'destructive' });
      return;
    }
    if (!ALLOWED_MIME_TYPES.has(selectedFile.type)) {
      toast({ title: 'File type not allowed', description: 'Use PDF, DOC, DOCX, PNG or JPG files.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error('You must be signed in to upload project documents.');

      const safeName = sanitizeFileName(selectedFile.name || `${docName.trim() || 'project-document'}.pdf`);
      const storagePath = `${project.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('private-documents').upload(storagePath, selectedFile, {
        contentType: selectedFile.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('project_documents').insert({
        project_id: project.id,
        document_name: docName.trim() || selectedFile.name,
        document_type: docType,
        storage_path: storagePath,
        mime_type: selectedFile.type,
        file_size_bytes: selectedFile.size,
        notes: docNotes.trim() || null,
        uploaded_by: userData.user.id,
      });

      if (insertError) {
        await supabase.storage.from('private-documents').remove([storagePath]);
        throw insertError;
      }

      await refreshDocuments();
      setIsUploadModalOpen(false);
      resetForm();
      toast({ title: 'Document uploaded', description: `${selectedFile.name} is now securely linked to ${project.title}.` });
    } catch (error) {
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Could not save the project document.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (doc: ProjectDocument) => {
    if (!window.confirm(`Delete ${doc.name}? This removes the stored file and its project record.`)) return;
    try {
      // Remove metadata first so the UI/database cannot retain a dangling document reference.
      // Storage cleanup is then attempted with a bounded retry. If Storage cleanup fails, the
      // metadata is already gone and the orphaned object can be safely reconciled by a cleanup job.
      const { error: deleteError } = await supabase.from('project_documents').delete().eq('id', doc.id).eq('project_id', project.id);
      if (deleteError) throw deleteError;

      let storageError: { message?: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await supabase.storage.from('private-documents').remove([doc.storage_path]);
        if (!result.error) {
          storageError = null;
          break;
        }
        storageError = result.error;
      }
      if (storageError) {
        throw new Error(`Document metadata was removed, but the stored file could not be cleaned up: ${storageError.message ?? 'Storage cleanup failed.'}`);
      }
      await refreshDocuments();
      if (viewingDoc?.id === doc.id) setViewingDoc(null);
      toast({ title: 'Document removed', description: 'The private file and its project record were deleted.' });
    } catch (error) {
      toast({ title: 'Delete failed', description: error instanceof Error ? error.message : 'Could not delete the project document.', variant: 'destructive' });
    }
  };

  const filteredDocs = useMemo(() => documents.filter((d) => {
    const matchesType = filterType === 'all' || d.doc_type === filterType;
    const q = searchQuery.toLowerCase();
    return matchesType && (d.name.toLowerCase().includes(q) || d.notes.toLowerCase().includes(q));
  }), [documents, filterType, searchQuery]);

  const getDocBadge = (type: ProjectDocument['doc_type']) => {
    const common = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold';
    switch (type) {
      case 'contract': return <span className={`${common} bg-blue-100 text-blue-800 border border-blue-200`}><FileText className="w-3 h-3" /> Contract Agreement</span>;
      case 'site_survey': return <span className={`${common} bg-amber-100 text-amber-800 border border-amber-200`}><ClipboardList className="w-3 h-3" /> Site Audit / Survey</span>;
      case 'completion_certificate': return <span className={`${common} bg-emerald-100 text-emerald-800 border border-emerald-200`}><Award className="w-3 h-3" /> Completion Signoff</span>;
      case 'safety_compliance': return <span className={`${common} bg-purple-100 text-purple-800 border border-purple-200`}><ShieldCheck className="w-3 h-3" /> Safety & Compliance</span>;
      default: return <span className={`${common} bg-gray-100 text-gray-700 border border-gray-200`}><FileCheck className="w-3 h-3" /> Supporting Document</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5"><div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100"><FileText className="w-5 h-5" /></div><div><h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">Project Document Vault <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-full">{documents.length} Files</span></h3><p className="text-xs text-gray-500">Private project records stored securely in Supabase.</p></div></div>
        <button onClick={() => setIsUploadModalOpen(true)} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"><UploadCloud className="w-4 h-4" /> Upload Document</button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-64"><Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search files or notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none" /></div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0"><Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 mr-1" />{[
          { id: 'all', label: 'All Docs' }, { id: 'contract', label: 'Contracts' }, { id: 'site_survey', label: 'Surveys' }, { id: 'completion_certificate', label: 'Certificates' }, { id: 'safety_compliance', label: 'Safety' },
        ].map((tab) => <button key={tab.id} onClick={() => setFilterType(tab.id)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${filterType === tab.id ? 'bg-indigo-500 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{tab.label}</button>)}</div>
      </div>

      {loading ? <div className="p-8 text-center text-xs text-gray-500">Loading secure project documents…</div> : filteredDocs.length === 0 ? <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50"><FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-xs font-semibold text-gray-600">No project documents found</p><p className="text-[11px] text-gray-400 mt-1">Upload the first project record to this private vault.</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{filteredDocs.map((doc) => <div key={doc.id} className="p-3.5 bg-gray-50/70 hover:bg-white border border-gray-200 hover:border-indigo-300 rounded-2xl transition-all shadow-2xs group flex flex-col justify-between"><div><div className="flex items-start justify-between gap-2 mb-2">{getDocBadge(doc.doc_type)}<span className="text-[10px] font-mono text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-100">{doc.file_size}</span></div><h4 className="font-bold text-xs text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5 line-clamp-1"><FileText className="w-4 h-4 text-red-500 shrink-0" />{doc.name}</h4>{doc.notes && <p className="text-[11px] text-gray-600 mt-1.5 line-clamp-2 italic bg-white p-2 rounded-lg border border-gray-100">"{doc.notes}"</p>}</div><div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-gray-400"><span>Uploaded {new Date(doc.uploaded_at).toLocaleDateString('en-KE')}</span><div className="flex items-center gap-1"><button onClick={() => void handleOpenDocument(doc)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px]"><Eye className="w-3.5 h-3.5" /> View</button><button onClick={() => void handleDownload(doc)} className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px]"><Download className="w-3.5 h-3.5" /> Download</button><button onClick={() => void handleDeleteDocument(doc)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete File"><Trash2 className="w-3.5 h-3.5" /></button></div></div></div>)}</div>
      )}

      {isUploadModalOpen && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4"><div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4"><div className="flex justify-between items-center pb-3 border-b border-gray-100"><h3 className="font-bold text-sm text-gray-900 flex items-center gap-2"><UploadCloud className="w-4 h-4 text-indigo-600" />Attach Project Document</h3><button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button></div><form onSubmit={handleFileUpload} className="space-y-3 text-xs"><div><label className="block font-semibold text-gray-700 mb-1">Document Type *</label><select value={docType} onChange={(e) => setDocType(e.target.value as ProjectDocument['doc_type'])} className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"><option value="contract">PDF Contract / Agreement</option><option value="site_survey">Site Inspection / Substrate Audit</option><option value="completion_certificate">Completion Certificate / Signoff</option><option value="safety_compliance">Safety & Environmental Clearance</option><option value="other">General Technical Report</option></select></div><div><label className="block font-semibold text-gray-700 mb-1">Document Name / Title</label><input type="text" placeholder="e.g. Approved_Moisture_Barrier_Contract_2026.pdf" value={docName} onChange={(e) => setDocName(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500" /></div><div><label className="block font-semibold text-gray-700 mb-1">File Attachment *</label><div className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer bg-gray-50/50 transition-colors"><input type="file" accept=".pdf,.doc,.docx,.png,.jpg" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} className="hidden" id="doc-file-input" /><label htmlFor="doc-file-input" className="cursor-pointer space-y-1 block"><UploadCloud className="w-6 h-6 text-indigo-500 mx-auto" />{selectedFile ? <p className="font-bold text-indigo-700 text-xs">{selectedFile.name}</p> : <><p className="font-semibold text-gray-700">Click to choose file</p><p className="text-[10px] text-gray-400">PDF, DOC, DOCX, PNG or JPG up to 10MB</p></>}</label></div></div><div><label className="block font-semibold text-gray-700 mb-1">Notes & Key Terms</label><textarea rows={3} placeholder="e.g. Scope includes 5-year warranty against substrate delamination..." value={docNotes} onChange={(e) => setDocNotes(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500" /></div><div className="pt-2 flex justify-end gap-2"><button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs">Cancel</button><button type="submit" disabled={saving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-bold text-xs shadow-xs">{saving ? 'Uploading…' : 'Upload Document'}</button></div></form></div></div>}

      {viewingDoc && <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-2xs flex items-center justify-center p-4"><div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200"><div className="p-4 bg-gray-900 text-white flex items-center justify-between"><div><h3 className="font-bold text-sm">{viewingDoc.name}</h3><p className="text-xs text-gray-400">{viewingDoc.file_size} • {viewingDoc.mime_type}</p></div><button onClick={() => setViewingDoc(null)} className="p-1.5 text-gray-400 hover:text-white rounded-lg"><X className="w-5 h-5" /></button></div><div className="flex-1 bg-gray-100 overflow-hidden">{viewingDoc.mime_type === 'application/pdf' ? <iframe title={viewingDoc.name} src={viewingDoc.file_url} className="w-full h-full" /> : <div className="h-full flex items-center justify-center p-6"><div className="bg-white p-8 rounded-2xl shadow-md max-w-xl w-full text-center space-y-4"><CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" /><p className="font-semibold text-gray-900">Secure document link ready</p><p className="text-sm text-gray-500">This file type is available through a temporary signed URL.</p><button onClick={() => void handleDownload(viewingDoc)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg inline-flex items-center gap-2"><Download className="w-4 h-4" /> Open Document</button></div></div>}</div></div></div>}
    </div>
  );
}
