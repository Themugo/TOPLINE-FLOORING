import React, { useState } from 'react';
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
  CheckCircle2,
  Search,
  Filter,
} from 'lucide-react';
import type { ProjectDocument, Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const SAMPLE_PROJECT_DOCUMENTS: ProjectDocument[] = [
  {
    id: 'doc-1',
    project_id: 'proj-1',
    name: 'Commercial_Flooring_Epoxy_Contract_2026.pdf',
    doc_type: 'contract',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '2.4 MB',
    uploaded_at: '2026-06-15',
    uploaded_by: 'Admin / Manager',
    notes: 'Signed contract detailing 4-layer epoxy coating and 5-year warranty agreement.',
  },
  {
    id: 'doc-2',
    project_id: 'proj-1',
    name: 'Substrate_Moisture_Site_Survey_Report.pdf',
    doc_type: 'site_survey',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '1.8 MB',
    uploaded_at: '2026-06-12',
    uploaded_by: 'Site Inspector / Kelvin',
    notes: 'Concrete relative humidity test results (RH 72%), CSP-3 grinding requirements confirmed.',
  },
  {
    id: 'doc-3',
    project_id: 'proj-1',
    name: 'Project_Completion_Certificate_Signoff.pdf',
    doc_type: 'completion_certificate',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '1.1 MB',
    uploaded_at: '2026-06-28',
    uploaded_by: 'Client Representative / Sarah',
    notes: 'Client quality acceptance and zero-punchlist completion certificate.',
  },
  {
    id: 'doc-4',
    project_id: 'proj-2',
    name: 'Waterproofing_Site_Audit_and_Specs.pdf',
    doc_type: 'site_survey',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '3.1 MB',
    uploaded_at: '2026-07-02',
    uploaded_by: 'Technical Lead / James',
    notes: 'Roof membrane expansion joint audit and substrate spall mapping.',
  },
];

interface ProjectDocumentManagerProps {
  project: Project;
  onUpdateProjectDocuments?: (updatedDocs: ProjectDocument[]) => void;
}

export function ProjectDocumentManager({
  project,
  onUpdateProjectDocuments,
}: ProjectDocumentManagerProps) {
  const { toast } = useToast();

  const [documents, setDocuments] = useState<ProjectDocument[]>(() => {
    const savedKey = `project_docs_${project.id}`;
    const saved = localStorage.getItem(savedKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse documents:', e);
      }
    }
    const filteredSample = SAMPLE_PROJECT_DOCUMENTS.filter(
      (d) => d.project_id === project.id
    );
    if (filteredSample.length > 0) return filteredSample;

    // Fallback default docs for any project
    return [
      {
        id: `doc-default-1-${project.id}`,
        project_id: project.id,
        name: `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_Master_Agreement.pdf`,
        doc_type: 'contract',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        file_size: '2.1 MB',
        uploaded_at: project.project_date || '2026-07-01',
        uploaded_by: 'Project Manager',
        notes: 'Standard service contract and technical specifications sheet.',
      },
      {
        id: `doc-default-2-${project.id}`,
        project_id: project.id,
        name: `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_Pre_Install_Survey.pdf`,
        doc_type: 'site_survey',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        file_size: '1.5 MB',
        uploaded_at: project.project_date || '2026-06-25',
        uploaded_by: 'Field Surveyor',
        notes: 'Pre-application slab condition, moisture test, and CSP profile notes.',
      },
    ];
  });

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDoc, setViewingDoc] = useState<ProjectDocument | null>(null);

  // Form states
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<ProjectDocument['doc_type']>('contract');
  const [docNotes, setDocNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const saveDocs = (newDocs: ProjectDocument[]) => {
    setDocuments(newDocs);
    localStorage.setItem(`project_docs_${project.id}`, JSON.stringify(newDocs));
    if (onUpdateProjectDocuments) {
      onUpdateProjectDocuments(newDocs);
    }
  };

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim() && !selectedFile) {
      toast({
        title: 'Missing document information',
        description: 'Please provide a document title or select a file to upload.',
        variant: 'destructive',
      });
      return;
    }

    const fileName = selectedFile ? selectedFile.name : `${docName.trim()}.pdf`;
    const fileSizeMB = selectedFile
      ? (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB'
      : '1.9 MB';

    const newDoc: ProjectDocument = {
      id: `doc-${Date.now()}`,
      project_id: project.id,
      name: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
      doc_type: docType,
      file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      file_size: fileSizeMB,
      uploaded_at: new Date().toISOString().split('T')[0],
      uploaded_by: 'Admin / Manager',
      notes: docNotes.trim() || 'Attached project record.',
    };

    const updated = [newDoc, ...documents];
    saveDocs(updated);
    setIsUploadModalOpen(false);

    // Reset
    setDocName('');
    setDocNotes('');
    setSelectedFile(null);

    toast({
      title: 'Document attached successfully',
      description: `"${newDoc.name}" has been linked to ${project.title}.`,
    });
  };

  const handleDeleteDocument = (id: string) => {
    const updated = documents.filter((d) => d.id !== id);
    saveDocs(updated);
    toast({
      title: 'Document removed',
      description: 'The file reference was deleted from this project.',
    });
  };

  const filteredDocs = documents.filter((d) => {
    const matchesType = filterType === 'all' || d.doc_type === filterType;
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.notes && d.notes.toLowerCase().includes(searchQuery.toLowerCase()));
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
                {documents.length} Files
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              PDF contracts, site inspection surveys, and client sign-off certificates.
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
      {filteredDocs.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-600">No matching documents found</p>
          <p className="text-[11px] text-gray-400 mt-1">
            Upload PDF contracts or site surveys to associate them with this project.
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
                    {doc.file_size}
                  </span>
                </div>

                <h4 className="font-bold text-xs text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5 line-clamp-1">
                  <FileText className="w-4 h-4 text-red-500 shrink-0" />
                  {doc.name}
                </h4>

                {doc.notes && (
                  <p className="text-[11px] text-gray-600 mt-1.5 line-clamp-2 italic bg-white p-2 rounded-lg border border-gray-100">
                    "{doc.notes}"
                  </p>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-gray-400">
                <span>Uploaded {doc.uploaded_at}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewingDoc(doc)}
                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px]"
                    title="Preview Document"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px]"
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

            <form onSubmit={handleFileUpload} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Document Type *
                </label>
                <select
                  value={docType}
                  onChange={(e) =>
                    setDocType(e.target.value as ProjectDocument['doc_type'])
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
                  Document Name / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved_Moisture_Barrier_Contract_2026.pdf"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  File Attachment (PDF / DOCX)
                </label>
                <div className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer bg-gray-50/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg"
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
                        <p className="text-[10px] text-gray-400">PDF, DOCX up to 25MB</p>
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
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  Attach Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm">{viewingDoc.name}</h3>
                  <p className="text-xs text-gray-400">
                    {viewingDoc.file_size} • Uploaded by {viewingDoc.uploaded_by || 'Admin'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-gray-100 p-6 flex flex-col items-center justify-center overflow-y-auto">
              <div className="bg-white p-8 rounded-2xl shadow-md max-w-xl w-full space-y-4 border border-gray-200 text-gray-800">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-xs text-gray-900">
                      OFFICIAL PROJECT RECORD
                    </span>
                  </div>
                  {getDocBadge(viewingDoc.doc_type)}
                </div>

                <div className="space-y-2 text-xs">
                  <p className="font-mono text-[11px] text-gray-500">
                    DOCUMENT ID: {viewingDoc.id}
                  </p>
                  <p className="font-semibold text-gray-900">
                    Project Reference: {project.title}
                  </p>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-700 leading-relaxed">
                    <strong>Summary / Scope Notes:</strong>
                    <br />
                    {viewingDoc.notes || 'No custom notes provided for this file.'}
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 text-indigo-900 rounded-xl border border-indigo-100 flex items-center justify-between text-xs font-semibold">
                  <span>Standard PDF Render Preview Active</span>
                  <a
                    href={viewingDoc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg flex items-center gap-1 hover:bg-indigo-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
