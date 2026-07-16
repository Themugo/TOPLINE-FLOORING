import { useState, useEffect, useCallback } from 'react';
import { Search, Globe, Save, AlertCircle, Plus, X, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/pages/admin/dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { SeoPage } from '@/lib/types';

export default function AdminSeo() {
  return (
    <AdminLayout title="SEO Manager">
      <SeoContent />
    </AdminLayout>
  );
}

function SeoContent() {
  const [seoPages, setSeoPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPage, setSelectedPage] = useState<SeoPage | null>(null);
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageForm, setNewPageForm] = useState({ page_type: 'product', page_id: '' });
  const { toast } = useToast();

  const fetchSeoPages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('seo_pages')
      .select('*')
      .order('page_type', { ascending: true });

    if (!error && data) {
      setSeoPages(data);
      if (data.length > 0 && !selectedPage) {
        setSelectedPage(data[0]);
      }
    }
    setLoading(false);
  }, [selectedPage]);

  useEffect(() => {
    fetchSeoPages();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageForm.page_id.trim()) {
      toast({ type: 'error', message: 'Enter a page identifier (e.g. a product slug)' });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('seo_pages')
        .insert({ page_type: newPageForm.page_type, page_id: newPageForm.page_id.trim() })
        .select()
        .single();
      if (error) throw error;
      toast({ type: 'success', message: 'SEO entry created' });
      setShowNewPage(false);
      setNewPageForm({ page_type: 'product', page_id: '' });
      await fetchSeoPages();
      setSelectedPage(data);
    } catch {
      toast({ type: 'error', message: 'Failed to create entry - it may already exist' });
    }
  };

  const handleDeletePage = async (page: SeoPage) => {
    if (!confirm(`Delete SEO settings for this page? It will fall back to defaults.`)) return;
    try {
      const { error } = await supabase.from('seo_pages').delete().eq('id', page.id);
      if (error) throw error;
      toast({ type: 'success', message: 'SEO entry deleted' });
      if (selectedPage?.id === page.id) setSelectedPage(null);
      await fetchSeoPages();
    } catch {
      toast({ type: 'error', message: 'Failed to delete entry' });
    }
  };

  const handleSave = async () => {
    if (!selectedPage) return;
    setSaving(true);

    const { error } = await supabase
      .from('seo_pages')
      .update({
        meta_title: selectedPage.meta_title,
        meta_description: selectedPage.meta_description,
        meta_keywords: selectedPage.meta_keywords,
        og_title: selectedPage.og_title,
        og_description: selectedPage.og_description,
        og_image: selectedPage.og_image,
        canonical_url: selectedPage.canonical_url,
        structured_data: selectedPage.structured_data,
        no_index: selectedPage.no_index,
        no_follow: selectedPage.no_follow
      })
      .eq('id', selectedPage.id);

    setSaving(false);
    if (error) {
      toast({ type: 'error', message: 'Failed to save SEO settings' });
    } else {
      toast({ type: 'success', message: 'SEO settings saved' });
      fetchSeoPages();
    }
  };

  const updateField = <K extends keyof SeoPage>(field: K, value: SeoPage[K]) => {
    if (!selectedPage) return;
    setSelectedPage({ ...selectedPage, [field]: value });
  };

  const getPageDisplayName = (page: SeoPage) => {
    const names: Record<string, string> = {
      home: 'Home Page',
      shop: 'Shop / Products',
      services: 'Services Page',
      portfolio: 'Portfolio / Projects',
      contact: 'Contact Page',
      quotation: 'Quotation Request',
      product: 'Product',
    };
    const label = names[page.page_type] || page.page_type;
    return page.page_id ? `${label}: ${page.page_id}` : label;
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading SEO settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Selector */}
      <div className="flex flex-wrap items-center gap-3">
        {seoPages.map((page) => (
          <div key={page.id} className="relative group">
            <button
              onClick={() => setSelectedPage(page)}
              className={`pl-4 pr-8 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPage?.id === page.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getPageDisplayName(page)}
            </button>
            {page.page_type === 'product' && (
              <button
                onClick={() => handleDeletePage(page)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${selectedPage?.id === page.id ? 'text-white' : 'text-gray-400'}`}
                title="Delete this entry"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setShowNewPage(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      {showNewPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowNewPage(false)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg text-gray-900">New SEO Entry</h2>
              <button onClick={() => setShowNewPage(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreatePage} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Type</label>
                <select value={newPageForm.page_type} onChange={(e) => setNewPageForm({ ...newPageForm, page_type: e.target.value })} className="input">
                  <option value="product">Product</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Slug</label>
                <input
                  required
                  value={newPageForm.page_id}
                  onChange={(e) => setNewPageForm({ ...newPageForm, page_id: e.target.value })}
                  className="input"
                  placeholder="e.g. epoxy-flooring-5l"
                />
                <p className="text-xs text-gray-400 mt-1">Find the slug in Admin -&gt; Products</p>
              </div>
              <button type="submit" className="btn-primary w-full">Create Entry</button>
            </form>
          </div>
        </div>
      )}

      {selectedPage && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
          {/* Meta Tags Section */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-500" />
              Meta Tags
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Title
                  <span className="text-gray-400 font-normal ml-2">
                    ({selectedPage.meta_title?.length || 0}/60)
                  </span>
                </label>
                <input
                  type="text"
                  value={selectedPage.meta_title || ''}
                  onChange={(e) => updateField('meta_title', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                    (selectedPage.meta_title?.length || 0) > 60 ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Page title for search engines"
                />
                {(selectedPage.meta_title?.length || 0) > 60 && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Title should be under 60 characters
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Keywords
                </label>
                <input
                  type="text"
                  value={selectedPage.meta_keywords || ''}
                  onChange={(e) => updateField('meta_keywords', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Description
                <span className="text-gray-400 font-normal ml-2">
                  ({selectedPage.meta_description?.length || 0}/160)
                </span>
              </label>
              <textarea
                value={selectedPage.meta_description || ''}
                onChange={(e) => updateField('meta_description', e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                  (selectedPage.meta_description?.length || 0) > 160 ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Brief description for search results"
              />
              {(selectedPage.meta_description?.length || 0) > 160 && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Description should be under 160 characters
                </p>
              )}
            </div>
          </div>

          {/* Open Graph Section */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Open Graph (Social Sharing)</h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OG Title
                </label>
                <input
                  type="text"
                  value={selectedPage.og_title || ''}
                  onChange={(e) => updateField('og_title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Title for social sharing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OG Image URL
                </label>
                <input
                  type="text"
                  value={selectedPage.og_image || ''}
                  onChange={(e) => updateField('og_image', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OG Description
              </label>
              <textarea
                value={selectedPage.og_description || ''}
                onChange={(e) => updateField('og_description', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Description for social sharing"
              />
            </div>
          </div>

          {/* Advanced Section */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Advanced Settings</h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Canonical URL
                </label>
                <input
                  type="text"
                  value={selectedPage.canonical_url || ''}
                  onChange={(e) => updateField('canonical_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://topline.co.ke/page"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Structured Data (JSON-LD)
                </label>
                <textarea
                  value={selectedPage.structured_data ? JSON.stringify(selectedPage.structured_data, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      updateField('structured_data', parsed);
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder='{"@type": "LocalBusiness", ...}'
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedPage.no_index || false}
                  onChange={(e) => updateField('no_index', e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">No Index (hide from search engines)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedPage.no_follow || false}
                  onChange={(e) => updateField('no_follow', e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">No Follow (don't follow links)</span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="p-6 bg-gray-50">
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save SEO Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Card */}
      {selectedPage && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary-500" />
            Search Result Preview
          </h3>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-blue-600 text-lg hover:underline cursor-pointer mb-1">
              {selectedPage.meta_title || 'Page Title'}
            </p>
            <p className="text-green-700 text-sm mb-2">
              {selectedPage.canonical_url || `https://topline.co.ke/${selectedPage.page_type}`}
            </p>
            <p className="text-gray-600 text-sm">
              {selectedPage.meta_description || 'No description set. Add a meta description to improve click-through rates.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
