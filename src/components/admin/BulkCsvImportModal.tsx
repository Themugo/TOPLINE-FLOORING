import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRight,
  Check,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/lib/types';

interface BulkCsvImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
  existingProjectCount: number;
}

interface FieldDefinition {
  key: keyof Omit<Project, 'id' | 'images' | 'display_order'> | 'title';
  label: string;
  required?: boolean;
  description: string;
  aliases: string[];
}

const SCHEMA_FIELDS: FieldDefinition[] = [
  {
    key: 'title',
    label: 'Project Title',
    required: true,
    description: 'Name of the project (e.g. Heavy Duty Epoxy Installation)',
    aliases: ['title', 'project title', 'project name', 'project', 'name', 'headline'],
  },
  {
    key: 'client_name',
    label: 'Client Name',
    description: 'Client or company name',
    aliases: ['client', 'client name', 'customer', 'company', 'client_name'],
  },
  {
    key: 'service_type',
    label: 'Service Type',
    description: 'e.g. Epoxy Flooring, Waterproofing, Concrete Polishing',
    aliases: ['service', 'service type', 'flooring type', 'service_type', 'type'],
  },
  {
    key: 'category',
    label: 'Category',
    description: 'e.g. Industrial, Commercial, Residential, Healthcare',
    aliases: ['category', 'sector', 'industry', 'market'],
  },
  {
    key: 'location',
    label: 'Location',
    description: 'City, region, or site address (e.g. Commercial District, Metro Area)',
    aliases: ['location', 'city', 'site', 'address', 'region'],
  },
  {
    key: 'description',
    label: 'Project Description',
    description: 'Detailed overview of the project scope',
    aliases: ['description', 'overview', 'details', 'summary', 'body'],
  },
  {
    key: 'materials_used',
    label: 'Materials Used & System Specs',
    description: 'e.g. 3mm Solvent-Free Epoxy Resin, Quartz Aggregate',
    aliases: ['materials', 'materials used', 'materials_used', 'specs', 'specification', 'system'],
  },
  {
    key: 'challenge',
    label: 'Challenge Faced',
    description: 'Problem or obstacle encountered on site',
    aliases: ['challenge', 'problem', 'issues', 'site_challenge'],
  },
  {
    key: 'solution',
    label: 'Solution Implemented',
    description: 'Technical approach and engineering solution',
    aliases: ['solution', 'approach', 'implementation', 'method'],
  },
  {
    key: 'results',
    label: 'Results & Outcomes',
    description: 'Final performance, durability, or key achievements',
    aliases: ['results', 'outcomes', 'impact', 'deliverables', 'benefits'],
  },
  {
    key: 'project_date',
    label: 'Start Date (YYYY-MM-DD)',
    description: 'Project start date format YYYY-MM-DD',
    aliases: ['start date', 'project date', 'date', 'started', 'project_date', 'start'],
  },
  {
    key: 'completion_date',
    label: 'Completion Date (YYYY-MM-DD)',
    description: 'Project finish date format YYYY-MM-DD',
    aliases: ['completion date', 'end date', 'completed', 'completion_date', 'finish'],
  },
  {
    key: 'area_size',
    label: 'Area Size',
    description: 'e.g. 5,000 sqm or 12,000 sq ft',
    aliases: ['area size', 'area', 'size', 'sqm', 'sqft', 'coverage', 'area_size'],
  },
  {
    key: 'featured',
    label: 'Featured (true / false)',
    description: 'Set to true to highlight on homepage',
    aliases: ['featured', 'is_featured', 'highlight', 'hero'],
  },
  {
    key: 'is_active',
    label: 'Active / Visible (true / false)',
    description: 'Set to true to publish on portfolio',
    aliases: ['active', 'is_active', 'visible', 'published', 'status'],
  },
];

// Robust CSV parser function
function parseCsvContent(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, ''); // Strip BOM if present
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function BulkCsvImportModal({
  onClose,
  onSuccess,
  existingProjectCount,
}: BulkCsvImportModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  // Sample CSV Downloader
  const downloadSampleCsv = () => {
    const sampleHeaders = SCHEMA_FIELDS.map((f) => f.label.split(' (')[0]).join(',');
    const sampleRow1 = [
      '"Heavy Duty Epoxy Coating - Logistics Hub"',
      '"Logistics Park Hub"',
      '"Epoxy Flooring"',
      '"Industrial"',
      '"Industrial Zone, Metro Area"',
      '"High-durability 3mm epoxy flooring for heavy forklift traffic in food warehouse."',
      '"3mm Solvent-Free Epoxy Resin, Quartz Aggregate, Polyurethane Topcoat"',
      '"Slab had severe oil contamination and uneven expansion joints."',
      '"Mechanical shot blasting, oil-seal primer application, self-leveling epoxy coat."',
      '"Achieved seamless, anti-slip, oil-resistant flooring with zero downtime."',
      '2024-02-10',
      '2024-02-18',
      '"5,200 sqm"',
      'true',
      'true',
    ].join(',');

    const sampleRow2 = [
      '"Commercial Terrazzo Refurbishment"',
      '"City Center Hotel"',
      '"Terrazzo Restoration"',
      '"Commercial"',
      '"Central Business District"',
      '"Complete diamond grinding and polished surface sealant for hotel lobby floor."',
      '"Diamond Grinding Discs, Lithium Silicate Hardener, High-Gloss Polish"',
      '"High foot traffic during daytime operation."',
      '"Phased night-shift execution with dust-free containment systems."',
      '"Restored original mirror finish with enhanced stain resistance."',
      '2024-03-01',
      '2024-03-05',
      '"1,800 sqm"',
      'false',
      'true',
    ].join(',');

    const csvContent = `data:text/csv;charset=utf-8,${encodeURIComponent(
      `${sampleHeaders}\n${sampleRow1}\n${sampleRow2}`
    )}`;
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'projects_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle File Select / Drop
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a valid .csv spreadsheet file.',
        variant: 'destructive',
      });
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsed = parseCsvContent(text);
      if (parsed.length < 2) {
        toast({
          title: 'Empty CSV File',
          description: 'The CSV file must contain a header row and at least 1 data row.',
          variant: 'destructive',
        });
        return;
      }

      const csvHeaders = parsed[0];
      const dataRows = parsed.slice(1);

      setHeaders(csvHeaders);
      setRawRows(dataRows);

      // Auto match columns based on aliases
      const initialMappings: Record<string, string> = {};
      SCHEMA_FIELDS.forEach((field) => {
        const match = csvHeaders.find((h) => {
          const cleanH = h.toLowerCase().trim();
          return field.aliases.some((alias) => cleanH.includes(alias) || alias.includes(cleanH));
        });
        if (match) {
          initialMappings[field.key] = match;
        } else {
          initialMappings[field.key] = '';
        }
      });

      setFieldMappings(initialMappings);

      // Select all rows by default
      const allIndices = new Set(dataRows.map((_, idx) => idx));
      setSelectedRowIndices(allIndices);

      setStep(2);
    };

    reader.readAsText(file);
  };

  // Mapping Handlers
  const handleMappingChange = (schemaKey: string, csvHeader: string) => {
    setFieldMappings((prev) => ({
      ...prev,
      [schemaKey]: csvHeader,
    }));
  };

  // Helper to get mapped value for a row and field
  const getMappedValue = (row: string[], schemaKey: string): string => {
    const csvHeader = fieldMappings[schemaKey];
    if (!csvHeader) return '';
    const headerIndex = headers.indexOf(csvHeader);
    if (headerIndex === -1 || headerIndex >= row.length) return '';
    return row[headerIndex]?.trim() || '';
  };

  // Parse mapped rows into clean objects
  const getParsedProjects = () => {
    return rawRows.map((row, index) => {
      const title = getMappedValue(row, 'title');
      const client_name = getMappedValue(row, 'client_name');
      const service_type = getMappedValue(row, 'service_type');
      const category = getMappedValue(row, 'category');
      const location = getMappedValue(row, 'location');
      const description = getMappedValue(row, 'description');
      const materials_used = getMappedValue(row, 'materials_used');
      const challenge = getMappedValue(row, 'challenge');
      const solution = getMappedValue(row, 'solution');
      const results = getMappedValue(row, 'results');
      const project_date = getMappedValue(row, 'project_date');
      const completion_date = getMappedValue(row, 'completion_date');
      const area_size = getMappedValue(row, 'area_size');

      const featuredVal = getMappedValue(row, 'featured').toLowerCase();
      const featured = ['true', 'yes', '1', 'y'].includes(featuredVal);

      const activeVal = getMappedValue(row, 'is_active').toLowerCase();
      const is_active = activeVal === '' ? true : ['true', 'yes', '1', 'y', 'active'].includes(activeVal);

      const isValid = title.length > 0;

      return {
        rowIndex: index,
        isValid,
        data: {
          title,
          client_name: client_name || null,
          service_type: service_type || null,
          category: category || null,
          location: location || null,
          description: description || null,
          materials_used: materials_used || null,
          challenge: challenge || null,
          solution: solution || null,
          results: results || null,
          project_date: project_date || null,
          completion_date: completion_date || null,
          area_size: area_size || null,
          featured,
          is_active,
        },
      };
    });
  };

  const parsedProjects = getParsedProjects();
  const validCount = parsedProjects.filter((p) => p.isValid).length;
  const isTitleMapped = Boolean(fieldMappings['title']);

  // Toggle selection
  const toggleRowSelect = (index: number) => {
    const next = new Set(selectedRowIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedRowIndices(next);
  };

  const toggleAllSelection = () => {
    if (selectedRowIndices.size === parsedProjects.length) {
      setSelectedRowIndices(new Set());
    } else {
      const all = new Set(parsedProjects.map((p) => p.rowIndex));
      setSelectedRowIndices(all);
    }
  };

  // Execute Bulk Insert
  const executeImport = async () => {
    const itemsToImport = parsedProjects.filter(
      (p) => p.isValid && selectedRowIndices.has(p.rowIndex)
    );

    if (itemsToImport.length === 0) {
      toast({
        title: 'No Rows Selected',
        description: 'Please select at least one valid project row to import.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: itemsToImport.length });

    try {
      let currentOrder = existingProjectCount + 1;
      const recordsToInsert = itemsToImport.map((p, idx) => {
        const title = p.data.title;
        const slugBase = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'project';
        const uniqueSlug = `${slugBase}-${Date.now().toString(36)}-${idx + 1}`;

        return {
          ...p.data,
          slug: uniqueSlug,
          display_order: currentOrder++,
        };
      });

      // Insert in chunks of 50
      const CHUNK_SIZE = 50;
      let insertedCount = 0;

      for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
        const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('projects').insert(chunk);

        if (error) {
          throw error;
        }

        insertedCount += chunk.length;
        setImportProgress({ current: insertedCount, total: recordsToInsert.length });
      }

      toast({
        title: 'Import Successful!',
        description: `Successfully created ${insertedCount} portfolio projects in Supabase.`,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Bulk CSV import failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while importing projects into the database.';
      toast({
        title: 'Import Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 my-8 shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 rounded-xl text-primary-600">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900">Bulk CSV Project Import</h2>
              <p className="text-xs text-gray-500">
                Upload spreadsheets to import dozens of projects at once.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Stepper */}
        <div className="py-3 px-2 bg-gray-50/80 my-4 rounded-xl border border-gray-200/60 flex items-center justify-around text-xs font-semibold text-gray-600 flex-shrink-0">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary-700 font-bold' : ''}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              1
            </span>
            <span>Upload File</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary-700 font-bold' : ''}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              2
            </span>
            <span>Map Columns</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary-700 font-bold' : ''}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              3
            </span>
            <span>Preview & Import</span>
          </div>
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-1 py-2">
          {/* STEP 1: UPLOAD CSV */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gray-50/50 hover:bg-gray-50 hover:border-primary-400 transition-all cursor-pointer group relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  Click or Drag & Drop CSV File
                </h3>
                <p className="text-xs text-gray-500 mb-4 max-w-md mx-auto">
                  Upload a standard comma-separated file (.csv) containing project titles, client info, dates, and technical details.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 shadow-sm">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Select .CSV File
                </div>
              </div>

              {/* Sample Template Section */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">Need a starting template?</h4>
                    <p className="text-xs text-amber-700/90 mt-0.5">
                      Download our pre-formatted sample CSV file containing all schema column headers and example projects.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="px-3 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4 text-amber-700" /> Download Template
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200/80 p-3 rounded-xl text-xs text-blue-900">
                <span>
                  Detected <strong>{headers.length} headers</strong> and{' '}
                  <strong>{rawRows.length} data rows</strong> in <code>{fileName}</code>.
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-blue-700 underline font-bold hover:text-blue-900"
                >
                  Change File
                </button>
              </div>

              {!isTitleMapped && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  Project Title is required! Please select a CSV column for Project Title.
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-3">
                  Map CSV Columns to Project Database Schema
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-2">
                  {SCHEMA_FIELDS.map((field) => (
                    <div
                      key={field.key}
                      className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">
                          {field.label}{' '}
                          {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {fieldMappings[field.key] ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Mapped
                          </span>
                        ) : (
                          <span className="text-[10px] bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">
                            Ignored
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{field.description}</p>
                      <select
                        value={fieldMappings[field.key] || ''}
                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                        className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      >
                        <option value="">-- Do Not Import --</option>
                        {headers.map((h, i) => (
                          <option key={`${h}-${i}`} value={h}>
                            CSV Column: "{h}"
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW DATA */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                <div>
                  <span className="font-bold text-gray-900">Preview Parsed Records:</span>{' '}
                  <span className="text-emerald-700 font-bold">{validCount} Ready</span> /{' '}
                  <span className="text-red-600 font-bold">
                    {parsedProjects.length - validCount} Missing Required Fields
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAllSelection}
                    className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    {selectedRowIndices.size === parsedProjects.length
                      ? 'Deselect All'
                      : 'Select All Valid'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-primary-600 font-bold hover:underline"
                  >
                    Back to Column Mapping
                  </button>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            selectedRowIndices.size === parsedProjects.length &&
                            parsedProjects.length > 0
                          }
                          onChange={toggleAllSelection}
                          className="rounded text-primary-600"
                        />
                      </th>
                      <th className="p-2.5 font-bold text-gray-700">Row #</th>
                      <th className="p-2.5 font-bold text-gray-700">Title</th>
                      <th className="p-2.5 font-bold text-gray-700">Client</th>
                      <th className="p-2.5 font-bold text-gray-700">Service & Category</th>
                      <th className="p-2.5 font-bold text-gray-700">Location</th>
                      <th className="p-2.5 font-bold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {parsedProjects.map((item) => (
                      <tr
                        key={item.rowIndex}
                        className={`hover:bg-gray-50/90 ${
                          !item.isValid ? 'bg-red-50/50' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            disabled={!item.isValid}
                            checked={selectedRowIndices.has(item.rowIndex)}
                            onChange={() => toggleRowSelect(item.rowIndex)}
                            className="rounded text-primary-600 disabled:opacity-30"
                          />
                        </td>
                        <td className="p-2.5 font-mono text-gray-500">#{item.rowIndex + 1}</td>
                        <td className="p-2.5 font-semibold text-gray-900 max-w-[180px] truncate">
                          {item.data.title || (
                            <span className="text-red-500 italic">[Missing Title]</span>
                          )}
                        </td>
                        <td className="p-2.5 text-gray-600 max-w-[120px] truncate">
                          {item.data.client_name || '-'}
                        </td>
                        <td className="p-2.5 text-gray-600">
                          <span className="font-medium text-gray-800">
                            {item.data.service_type || '-'}
                          </span>
                          {item.data.category && (
                            <span className="text-[10px] text-gray-400 block">
                              {item.data.category}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-gray-600 max-w-[120px] truncate">
                          {item.data.location || '-'}
                        </td>
                        <td className="p-2.5">
                          {item.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3 text-red-600" /> Missing Title
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isImporting && (
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-primary-900 font-bold text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
                    Inserting records into database ({importProgress.current} /{' '}
                    {importProgress.total})...
                  </div>
                  <div className="w-full bg-primary-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary-600 h-full transition-all duration-300"
                      style={{
                        width: `${
                          (importProgress.current / Math.max(1, importProgress.total)) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="btn-secondary text-xs"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!isTitleMapped}
                className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                Preview Mapped Data <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={executeImport}
                disabled={isImporting || selectedRowIndices.size === 0}
                className="btn-primary text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-md"
              >
                <Upload className="w-4 h-4" />
                {isImporting
                  ? 'Importing...'
                  : `Confirm & Import ${selectedRowIndices.size} Projects`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
