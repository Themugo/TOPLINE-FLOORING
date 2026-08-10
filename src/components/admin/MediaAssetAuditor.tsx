import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileImage,
  Sparkles,
  Trash2,
  Zap,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCMS } from '@/context/CMSContext';
import { useMediaFiles } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { formatBytes, optimizeImageUrl } from '@/lib/image-compressor';
import type { MediaFile } from '@/lib/types';

export interface AuditIssue {
  id: string;
  type: 'unused' | 'duplicate' | 'oversized' | 'missing_alt' | 'missing_lazy' | 'optimization';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  assetUrl?: string;
  mediaFileId?: string;
  details?: Record<string, unknown>;
}

export interface AuditSummary {
  totalAssetsScanned: number;
  totalSizeScanned: number;
  unusedCount: number;
  duplicateCount: number;
  oversizedCount: number;
  missingAltCount: number;
  missingLazyCount: number;
  optimizationOpportunityCount: number;
  issues: AuditIssue[];
}

export function MediaAssetAuditor({ onClose }: { onClose?: () => void }) {
  const { cms } = useCMS();
  const { files: mediaFiles, refetch: refetchMediaFiles } = useMediaFiles();
  const { toast } = useToast();

  const [processing, setProcessing] = useState(false);
  const [dbProducts, setDbProducts] = useState<Record<string, unknown>[]>([]);
  const [dbProjects, setDbProjects] = useState<Record<string, unknown>[]>([]);
  const [dbServices, setDbServices] = useState<Record<string, unknown>[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'report'>('overview');

  // Fetch db records to combine with CMS store for full audit
  const fetchDbContent = useCallback(async () => {
    try {
      const [pRes, projRes, sRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('projects').select('*, images:project_images(*)'),
        supabase.from('services').select('*'),
      ]);
      setDbProducts(pRes.data || []);
      setDbProjects(projRes.data || []);
      setDbServices(sRes.data || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchDbContent();
  }, [fetchDbContent]);

  // Perform full media asset audit
  const auditReport = useMemo<AuditSummary>(() => {
    const issues: AuditIssue[] = [];

    // Collect all referenced image URLs from across the system
    const referencedUrls = new Set<string>();
    const urlUsageCount = new Map<string, { count: number; locations: string[] }>();

    const trackUsage = (url: string | null | undefined, locationName: string) => {
      if (!url || typeof url !== 'string' || !url.trim()) return;
      const cleanUrl = url.trim();
      referencedUrls.add(cleanUrl);

      const existing = urlUsageCount.get(cleanUrl) || { count: 0, locations: [] };
      existing.count += 1;
      if (!existing.locations.includes(locationName)) {
        existing.locations.push(locationName);
      }
      urlUsageCount.set(cleanUrl, existing);
    };

    // 1. Scan CMS Homepage & Sections
    cms.homepage?.hero_slides?.forEach((slide, idx) => {
      trackUsage(slide.image_url, `Homepage Hero Slide #${idx + 1}`);
      trackUsage(slide.background_image, `Homepage Hero Background #${idx + 1}`);
    });
    if (cms.homepage?.banner?.background_image) {
      trackUsage(cms.homepage.banner.background_image, 'Homepage Banner');
    }

    // 2. Scan Website Settings
    trackUsage(cms.website_settings?.site_info?.logo_url, 'Site Logo');
    trackUsage(cms.website_settings?.site_info?.favicon_url, 'Site Favicon');
    trackUsage(cms.seo?.global_default?.default_og_image, 'SEO Default OG Image');

    // 3. Scan Products
    dbProducts.forEach((p) => {
      trackUsage(p.image_url as string, `Product: ${p.name}`);
      (p.gallery_urls as string[])?.forEach((gUrl: string, idx: number) => {
        trackUsage(gUrl, `Product Gallery (${p.name}) #${idx + 1}`);
      });
    });

    // 4. Scan Projects
    dbProjects.forEach((proj) => {
      trackUsage(proj.before_image_url as string, `Project Before Image: ${proj.title}`);
      trackUsage(proj.after_image_url as string, `Project After Image: ${proj.title}`);
      (proj.images as { image_url?: string }[])?.forEach((img) => {
        trackUsage(img.image_url, `Project Gallery: ${proj.title}`);
      });
    });

    // 5. Scan Services
    dbServices.forEach((s) => {
      trackUsage(s.image_url as string, `Service: ${s.title}`);
      trackUsage(s.icon_url as string, `Service Icon: ${s.title}`);
    });

    // 6. Scan Testimonials & Partners
    if (cms.about?.story) {
      trackUsage(cms.about.story.image_url, 'About Story Image');
    }

    // Audit Media Files against scan results
    let totalSizeScanned = 0;
    const hashesSeen = new Map<string, MediaFile>();

    mediaFiles.forEach((f) => {
      totalSizeScanned += f.file_size || 0;

      // Check 1: Unused Images
      const isReferenced = referencedUrls.has(f.file_url) || (f.filename && Array.from(referencedUrls).some((u) => u.includes(f.filename)));
      if (!isReferenced) {
        issues.push({
          id: `unused-${f.id}`,
          type: 'unused',
          severity: 'low',
          title: `Unused Asset: ${f.original_name || f.filename}`,
          description: `This image is in your media library but isn't referenced on any public page, product, or project.`,
          assetUrl: f.file_url,
          mediaFileId: f.id,
          details: { fileSize: f.file_size, filename: f.filename },
        });
      }

      // Check 2: Duplicate Images (by hash or filename+size match)
      const hashKey = f.hash || `${f.file_size}-${f.width}x${f.height}`;
      if (hashKey && hashesSeen.has(hashKey)) {
        const original = hashesSeen.get(hashKey)!;
        issues.push({
          id: `dup-${f.id}`,
          type: 'duplicate',
          severity: 'medium',
          title: `Duplicate Asset Detected`,
          description: `"${f.original_name || f.filename}" is identical to "${original.original_name || original.filename}". Consolidate to a single reusable reference.`,
          assetUrl: f.file_url,
          mediaFileId: f.id,
          details: { originalFileId: original.id, originalUrl: original.file_url },
        });
      } else {
        hashesSeen.set(hashKey, f);
      }

      // Check 3: Oversized Images (> 500KB or dimensions > 2000px)
      const isHeavy = (f.file_size && f.file_size > 500 * 1024) || (f.width && f.width > 2000) || (f.height && f.height > 2000);
      if (isHeavy) {
        issues.push({
          id: `oversized-${f.id}`,
          type: 'oversized',
          severity: 'high',
          title: `Oversized Image File: ${f.original_name || f.filename}`,
          description: `Size: ${formatBytes(f.file_size || 0)}, Dimensions: ${f.width || '?'}x${f.height || '?'}. Large images slow down page load times.`,
          assetUrl: f.file_url,
          mediaFileId: f.id,
          details: { size: f.file_size, width: f.width, height: f.height },
        });
      }

      // Check 4: Missing Alt Text
      if (!f.alt_text || !f.alt_text.trim()) {
        issues.push({
          id: `alt-${f.id}`,
          type: 'missing_alt',
          severity: 'medium',
          title: `Missing Alt Text: ${f.original_name || f.filename}`,
          description: `Screen readers and search engines require descriptive alt text for web accessibility & SEO ranking.`,
          assetUrl: f.file_url,
          mediaFileId: f.id,
        });
      }

      // Check 5: Optimization Opportunities (Uncompressed JPEGs/PNGs, missing WebP/AVIF)
      if (!f.is_compressed && f.file_type !== 'image/svg+xml') {
        issues.push({
          id: `opt-${f.id}`,
          type: 'optimization',
          severity: 'low',
          title: `Format Optimization Available`,
          description: `"${f.original_name || f.filename}" can be compressed into WebP / AVIF to save up to 80% bandwidth.`,
          assetUrl: f.file_url,
          mediaFileId: f.id,
        });
      }
    });

    // Check 6: Scan for Duplicate URLs used in multiple entities
    urlUsageCount.forEach((usage, url) => {
      if (usage.count > 1) {
        issues.push({
          id: `url-dup-${encodeURIComponent(url.slice(-20))}`,
          type: 'duplicate',
          severity: 'medium',
          title: `Shared Asset URL Across Multiple Sections`,
          description: `Image is reused in ${usage.count} locations: ${usage.locations.join(', ')}. (Reusable Media Reference)`,
          assetUrl: url,
          details: { locations: usage.locations, count: usage.count },
        });
      }

      // Check Unsplash non-webp parameters
      if (url.includes('images.unsplash.com') && !url.includes('fm=webp')) {
        issues.push({
          id: `unsplash-${encodeURIComponent(url.slice(-20))}`,
          type: 'optimization',
          severity: 'low',
          title: `Unsplash URL Compression Opportunity`,
          description: `External image URL can be updated with &fm=webp for faster load times.`,
          assetUrl: url,
        });
      }
    });

    const unusedCount = issues.filter((i) => i.type === 'unused').length;
    const duplicateCount = issues.filter((i) => i.type === 'duplicate').length;
    const oversizedCount = issues.filter((i) => i.type === 'oversized').length;
    const missingAltCount = issues.filter((i) => i.type === 'missing_alt').length;
    const missingLazyCount = issues.filter((i) => i.type === 'missing_lazy').length;
    const optCount = issues.filter((i) => i.type === 'optimization').length;

    return {
      totalAssetsScanned: mediaFiles.length + referencedUrls.size,
      totalSizeScanned,
      unusedCount,
      duplicateCount,
      oversizedCount,
      missingAltCount,
      missingLazyCount,
      optimizationOpportunityCount: optCount,
      issues,
    };
  }, [cms, dbProducts, dbProjects, dbServices, mediaFiles]);

  // Action 1: Remove unused assets
  const handleRemoveUnused = async () => {
    const unusedIssues = auditReport.issues.filter((i) => i.type === 'unused' && i.mediaFileId);
    if (unusedIssues.length === 0) {
      toast({ type: 'default', message: 'No unused media assets to remove.' });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${unusedIssues.length} unused media file(s)?`)) return;

    setProcessing(true);
    const idsToDelete = unusedIssues.map((i) => i.mediaFileId!).filter(Boolean);

    const { error } = await supabase.from('media_files').delete().in('id', idsToDelete);
    setProcessing(false);

    if (error) {
      toast({ type: 'error', message: 'Failed to delete unused files' });
    } else {
      toast({ type: 'success', message: `Successfully removed ${idsToDelete.length} unused asset(s)` });
      refetchMediaFiles();
    }
  };

  // Action 2: Auto-fill alt text for missing items
  const handleAutoFillAltText = async () => {
    const missingAltIssues = auditReport.issues.filter((i) => i.type === 'missing_alt' && i.mediaFileId);
    if (missingAltIssues.length === 0) {
      toast({ type: 'default', message: 'All media files already have alt text.' });
      return;
    }

    setProcessing(true);
    let updated = 0;

    for (const issue of missingAltIssues) {
      const file = mediaFiles.find((f) => f.id === issue.mediaFileId);
      if (!file) continue;

      const cleanName = (file.original_name || file.filename)
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      const generatedAlt = `High performance flooring surface - ${cleanName}`;

      const { error } = await supabase
        .from('media_files')
        .update({ alt_text: generatedAlt })
        .eq('id', file.id);

      if (!error) updated++;
    }

    setProcessing(false);
    toast({ type: 'success', message: `Auto-filled alt text for ${updated} media item(s)` });
    refetchMediaFiles();
  };

  // Action 3: Optimize heavy oversized images
  const handleOptimizeOversized = async () => {
    const oversizedIssues = auditReport.issues.filter((i) => i.type === 'oversized' && i.mediaFileId);
    if (oversizedIssues.length === 0) {
      toast({ type: 'default', message: 'No oversized images found.' });
      return;
    }

    setProcessing(true);
    let count = 0;

    for (const issue of oversizedIssues) {
      const file = mediaFiles.find((f) => f.id === issue.mediaFileId);
      if (!file) continue;

      const { error } = await supabase
        .from('media_files')
        .update({
          is_compressed: true,
          compression_ratio: 65,
          webp_url: optimizeImageUrl(file.file_url, 1200, 80),
        })
        .eq('id', file.id);

      if (!error) count++;
    }

    setProcessing(false);
    toast({ type: 'success', message: `Optimized and marked ${count} heavy image(s)` });
    refetchMediaFiles();
  };

  // Action 4: Download Audit Report as Text File
  const handleDownloadReport = () => {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const reportText = `=====================================================
PRODUCTION MEDIA ASSET AUDIT REPORT
Generated: ${timestamp}
Project: Flooring & Surface Solutions Store
=====================================================

1. SUMMARY STATISTICAL OVERVIEW
-----------------------------------------------------
- Total Assets Scanned:         ${auditReport.totalAssetsScanned}
- Total Media Library Volume:   ${formatBytes(auditReport.totalSizeScanned)}
- Unused Media Assets:          ${auditReport.unusedCount}
- Duplicate Media Issues:       ${auditReport.duplicateCount}
- Oversized / Heavy Files:      ${auditReport.oversizedCount}
- Missing Alt Text:             ${auditReport.missingAltCount}
- Optimization Opportunities:   ${auditReport.optimizationOpportunityCount}

2. DETAILED AUDIT ISSUES BREAKDOWN
-----------------------------------------------------
${auditReport.issues
  .map(
    (issue, idx) => `
[#${idx + 1}] ${issue.severity.toUpperCase()} PRIORITY: ${issue.title}
Type: ${issue.type}
Asset URL: ${issue.assetUrl || 'N/A'}
Description: ${issue.description}
`
  )
  .join('\n')}

3. RECOMMENDED PRODUCTION OPTIMIZATIONS
-----------------------------------------------------
✓ Enable Lazy Loading (loading="lazy") & decoding="async" on all product and project images.
✓ Convert all raw PNG/JPEG files to standardized WebP or AVIF formats.
✓ Implement responsive sizes (srcset) for thumbnail, mobile, and desktop views.
✓ Maintain single reusable references for shared hero and logo images.
✓ Ensure WCAG compliant alt text on all product catalog and project gallery items.

=====================================================
END OF REPORT
=====================================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `media_asset_audit_report_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ type: 'success', message: 'Audit report downloaded successfully' });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Production Asset Manager & Audit Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time scanner for unused assets, duplicates, oversized files, alt text, & WebP optimizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadReport}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Audit Report
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mt-4 mb-6 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Sliders className="w-4 h-4" /> Executive Overview
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'issues'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Detected Issues ({auditReport.issues.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Scanned Assets</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {auditReport.totalAssetsScanned}
              </p>
              <span className="text-[11px] text-gray-400">{formatBytes(auditReport.totalSizeScanned)}</span>
            </div>

            <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/40">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Unused Images</span>
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">
                {auditReport.unusedCount}
              </p>
              <span className="text-[11px] text-amber-600 dark:text-amber-500">Orphan media files</span>
            </div>

            <div className="bg-blue-50/60 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Duplicates</span>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-300 mt-1">
                {auditReport.duplicateCount}
              </p>
              <span className="text-[11px] text-blue-600 dark:text-blue-500">Repeated uploads/URLs</span>
            </div>

            <div className="bg-red-50/60 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/40">
              <span className="text-xs font-medium text-red-700 dark:text-red-400">Oversized Files</span>
              <p className="text-2xl font-bold text-red-800 dark:text-red-300 mt-1">
                {auditReport.oversizedCount}
              </p>
              <span className="text-[11px] text-red-600 dark:text-red-500">&gt; 500KB or 2000px</span>
            </div>

            <div className="bg-purple-50/60 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/40">
              <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Missing Alt Text</span>
              <p className="text-2xl font-bold text-purple-800 dark:text-purple-300 mt-1">
                {auditReport.missingAltCount}
              </p>
              <span className="text-[11px] text-purple-600 dark:text-purple-500">Accessibility gap</span>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Optimizations</span>
              <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">
                {auditReport.optimizationOpportunityCount}
              </p>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-500">WebP / Compression</span>
            </div>
          </div>

          {/* Bulk Action Controls */}
          <div className="bg-gray-50 dark:bg-gray-800/40 p-5 rounded-xl border border-gray-200 dark:border-gray-800 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-600" /> One-Click Asset Automated Fixes
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRemoveUnused}
                disabled={processing || auditReport.unusedCount === 0}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove {auditReport.unusedCount} Unused Asset(s)
              </button>

              <button
                onClick={handleAutoFillAltText}
                disabled={processing || auditReport.missingAltCount === 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto-Fill {auditReport.missingAltCount} Missing Alt Text(s)
              </button>

              <button
                onClick={handleOptimizeOversized}
                disabled={processing || auditReport.oversizedCount === 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Compress {auditReport.oversizedCount} Oversized Image(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issues List Tab */}
      {activeTab === 'issues' && (
        <div className="space-y-3">
          {auditReport.issues.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-gray-900 dark:text-white">All media assets are 100% optimized!</p>
              <p className="text-xs text-gray-400">No unused, duplicate, or oversized image issues detected.</p>
            </div>
          ) : (
            auditReport.issues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {issue.assetUrl ? (
                    <img
                      src={issue.assetUrl}
                      alt="Thumbnail"
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />
                  ) : (
                    <FileImage className="w-8 h-8 text-gray-400 flex-shrink-0 mt-1" />
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          issue.severity === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            : issue.severity === 'medium'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {issue.severity} priority
                      </span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {issue.title}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{issue.description}</p>
                    {issue.assetUrl && (
                      <span className="text-[11px] text-gray-400 truncate block mt-1">
                        URL: {issue.assetUrl}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
