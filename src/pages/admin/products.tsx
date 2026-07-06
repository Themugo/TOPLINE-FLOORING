import { useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useProducts, useCategories } from '@/hooks/use-data';
import { formatKES } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/types';

export default function AdminProducts() {
  const { products, loading, refetch } = useProducts();
  const { categories } = useCategories();
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    category_id: '',
    description: '',
    price: '',
    unit: 'sqm',
    image_url: '',
    featured: false,
    in_stock: true,
  });

  const resetForm = () => {
    setForm({
      name: '',
      slug: '',
      category_id: '',
      description: '',
      price: '',
      unit: 'sqm',
      image_url: '',
      featured: false,
      in_stock: true,
    });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    const data = {
      name: form.name,
      slug,
      category_id: form.category_id || null,
      description: form.description,
      price: parseFloat(form.price),
      unit: form.unit,
      image_url: form.image_url || null,
      featured: form.featured,
      in_stock: form.in_stock,
      is_active: true,
    };

    if (editing) {
      const { error } = await supabase
        .from('products')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editing.id);
      if (!error) refetch();
    } else {
      const { error } = await supabase.from('products').insert(data);
      if (!error) refetch();
    }
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) refetch();
  };

  const editProduct = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      slug: product.slug,
      category_id: product.category_id || '',
      description: product.description || '',
      price: product.price.toString(),
      unit: product.unit,
      image_url: product.image_url || '',
      featured: product.featured,
      in_stock: product.in_stock,
    });
    setShowForm(true);
  };

  return (
    <AdminLayout title="Products">
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden">
                          {product.image_url && (
                            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {product.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">{formatKES(product.price)}/{product.unit}</td>
                    <td className="px-6 py-4">
                      {product.in_stock ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">In Stock</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Out of Stock</span>
                      )}
                      {product.featured && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded ml-1">Featured</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => editProduct(product)} className="p-2 text-gray-600 hover:text-gray-900">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="input"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (KES) *</label>
                  <input
                    type="number"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="input"
                  >
                    <option value="sqm">sqm</option>
                    <option value="piece">piece</option>
                    <option value="bucket">bucket</option>
                    <option value="roll">roll</option>
                    <option value="cartridge">cartridge</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="input"
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  />
                  <span className="text-sm">Featured</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.in_stock}
                    onChange={(e) => setForm({ ...form, in_stock: e.target.checked })}
                  />
                  <span className="text-sm">In Stock</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
