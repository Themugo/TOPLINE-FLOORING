import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, FolderOpen, Search, Loader2 } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useCategories } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { ImageUpload } from '@/components/ui/image-upload';
import type { Category } from '@/lib/types';

export default function AdminCategories() {
  const { categories, loading, refetch } = useCategories();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', slug: '', description: '', image_url: '' });

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', image_url: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    try {
      if (editing) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: form.name,
            slug,
            description: form.description || null,
            image_url: form.image_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Category updated successfully' });
      } else {
        const { error } = await supabase.from('categories').insert({
          name: form.name,
          slug,
          description: form.description || null,
          image_url: form.image_url || null,
        });
        if (error) throw error;
        toast({ title: 'Category created successfully' });
      }
      await refetch();
      resetForm();
    } catch {
      toast({ title: 'Failed to save category', description: 'That slug or name may already be in use.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Products in it will lose their category association.')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      await refetch();
      toast({ title: 'Category deleted' });
    } catch {
      toast({ title: 'Failed to delete category', variant: 'destructive' });
    }
  };

  const editCategory = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image_url: cat.image_url || '',
    });
    setShowForm(true);
  };

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term) || (c.description && c.description.toLowerCase().includes(term))
    );
  }, [categories, search]);

  return (
    <AdminLayout
      title="Product Categories"
      subtitle="Organize materials and catalog products by type and application"
      actions={
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      }
    >
      {/* Search Bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-primary-500 shadow-2xs"
          />
        </div>
        <span className="text-xs font-medium text-gray-500">
          Showing {filteredCategories.length} of {categories.length} categories
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
          <p className="text-xs text-gray-500 font-medium">Loading catalog categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-2xs">
          <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 text-sm mb-1">No Categories Found</h3>
          <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
            {search ? `No categories matching "${search}".` : 'Get started by creating your first product category.'}
          </p>
          <button
            onClick={() => {
              setSearch('');
              setShowForm(true);
            }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold"
          >
            Add New Category
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Image</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category Name</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-3">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 font-semibold text-navy-900">{cat.name}</td>
                  <td className="px-6 py-3 text-gray-500 font-mono text-[11px]">{cat.slug}</td>
                  <td className="px-6 py-3 text-gray-600 max-w-md truncate">{cat.description || '—'}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => editCategory(cat)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit Category"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Category Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" onClick={resetForm}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h2 className="font-display font-bold text-navy-900 text-base">{editing ? 'Edit Category' : 'Add New Category'}</h2>
              <button onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category Image</label>
                <ImageUpload
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                  folder="categories"
                  label="Category Icon/Banner"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g. Laminate Flooring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">URL Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary-500"
                  placeholder="laminate-flooring (auto-generated if empty)"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 min-h-[70px]"
                  placeholder="Brief description of products in this category..."
                />
              </div>
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Saving...' : editing ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
