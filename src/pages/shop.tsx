import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { ProductFilters, type FilterOptions } from '@/components/filter/ProductFilters';
import { useProducts, useCategories } from '@/hooks/use-data';
import { formatKES } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';
import type { Product } from '@/lib/types';

export default function Shop() {
  const [location] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const { categories } = useCategories();
  const { products } = useProducts({
    categoryId: selectedCategory || undefined,
    search: searchQuery,
    priceRange: filterOptions.priceRange,
    brands: filterOptions.brands,
    materials: filterOptions.materials,
    inStock: filterOptions.inStock,
    isNewArrival: filterOptions.isNewArrival,
    isBestSeller: filterOptions.isBestSeller,
    isClearance: filterOptions.isClearance,
    sortBy: filterOptions.sortBy,
  });
  const { addItem } = useCart();

  // Get available brands and materials from products
  const availableBrands = Array.from(new Set(products.map(p => p.brand?.name).filter(Boolean) as string[]));
  const availableMaterials = Array.from(new Set(products.map(p => p.material).filter(Boolean) as string[]));

  // Parse URL params for search and category
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const searchParam = params.get('search');
    const categoryParam = params.get('category');
    
    if (searchParam) setSearchQuery(searchParam);
    if (categoryParam) setSelectedCategory(categoryParam);
  }, [location]);

  const handleAddToCart = (product: Product) => {
    addItem(product);
  };

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="mb-8">
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-navy-900 mb-2">
              Materials Shop
            </h1>
            <p className="text-gray-600">
              Premium waterproofing and flooring materials sourced from trusted global brands.
              Delivered to your project site across Kenya.
            </p>
          </div>

          {/* Advanced Search Bar */}
          <div className="mb-8">
            <AdvancedSearch 
              onSearch={(query) => setSearchQuery(query)}
            />
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="card p-6 sticky top-24">
                <ProductFilters
                  options={filterOptions}
                  onChange={setFilterOptions}
                  availableBrands={availableBrands}
                  availableMaterials={availableMaterials}
                />
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        !selectedCategory
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      All Products
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-1">
              <div className="mb-4 text-sm text-gray-500">
                Showing {products.length} product{products.length !== 1 && 's'}
                {searchQuery && <span> for "{searchQuery}"</span>}
                {selectedCategory && <span> in selected category</span>}
              </div>

              {products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product: Product) => (
                    <div key={product.id} className="card group">
                      <Link href={`/product/${product.slug}`}>
                        <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                          <img
                            src={product.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80'}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {product.featured && (
                            <span className="absolute top-3 left-3 bg-accent-500 text-white text-xs font-medium px-2 py-1 rounded">
                              Featured
                            </span>
                          )}
                        </div>
                      </Link>
                      <div className="p-5">
                        {product.category && (
                          <p className="text-xs font-medium text-primary-600 uppercase tracking-wide mb-2">
                            {product.category.name}
                          </p>
                        )}
                        <Link href={`/product/${product.slug}`}>
                          <h3 className="font-semibold text-gray-900 mb-2 hover:text-primary-600 transition-colors">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-gray-900">{formatKES(product.price)}</p>
                            <p className="text-xs text-gray-500">per {product.unit}</p>
                          </div>
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="btn-primary py-2 px-4"
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <p className="text-gray-500 mb-2">No products found</p>
                  <p className="text-sm text-gray-400">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
