import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Search, Filter, X, ShoppingCart, Check, ShieldCheck, Truck, Sparkles, Tag, ArrowRight, PackageCheck, SlidersHorizontal } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useProducts, useCategories } from '@/hooks/use-data';
import { useSeoMeta } from '@/hooks/use-seo';
import { formatKES } from '@/lib/utils';
import { getProductPlaceholder, withFallback } from '@/lib/placeholders';
import { useCart } from '@/hooks/use-cart';
import { useImagePreloader } from '@/hooks/use-image-preloader';
import type { Product } from '@/lib/types';

export default function Shop() {
  useSeoMeta('shop', null, { breadcrumbs: [{ label: 'Shop' }] });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const { categories } = useCategories();
  const { products, loading } = useProducts(
    selectedCategory ? { categoryId: selectedCategory } : undefined
  );
  const { addItem } = useCart();

  // Preload product images for zero image load delay
  useImagePreloader(
    useMemo(() => {
      const urls: string[] = [];
      products.forEach((p) => {
        if (p.image_url) urls.push(p.image_url);
        if (p.gallery_urls && Array.isArray(p.gallery_urls)) {
          p.gallery_urls.forEach((url) => urls.push(url));
        }
        const categorySlug = p.category?.slug || p.category?.name;
        urls.push(getProductPlaceholder(categorySlug));
      });
      return urls;
    }, [products])
  );

  // Compute category item counts
  const categoryItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.category_id) {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStock = !inStockOnly || product.in_stock;
        return matchesSearch && matchesStock;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        // Featured first
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.display_order - b.display_order;
      });
  }, [products, searchQuery, inStockOnly, sortBy]);

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setAddedItemIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: 'Materials Shop' }]} />
      <div className="min-h-screen bg-gray-50/60">
        {/* Hero Banner Header */}
        <section className="bg-gradient-to-b from-gray-50 via-white to-gray-50 border-b border-gray-200/80 py-12 lg:py-16 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <span className="inline-block px-3.5 py-1 rounded-full bg-primary-50 text-primary-600 border border-primary-100 text-xs font-semibold uppercase tracking-wider mb-3">
              Certified Chemical & Material Supplies
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-950 tracking-tight mb-3">
              Industrial Materials Shop
            </h1>
            <p className="text-navy-600 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
              Premium epoxy resins, polyurethane screeds, liquid waterproofing membranes, and concrete densifiers. Directly delivered to your project site.
            </p>

            {/* Value Props Bar */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-6 sm:gap-10 text-xs sm:text-sm font-semibold text-navy-800">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary-500" />
                <span>Fast Direct Site Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary-500" />
                <span>Batch Quality & TDS Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-primary-500" />
                <span>Bulk Commercial Rates Available</span>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:w-72 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sticky top-24 shadow-2xs">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                  <h2 className="font-display font-bold text-navy-950 flex items-center gap-2 text-base">
                    <Filter className="w-4 h-4 text-primary-500" />
                    Filter Materials
                  </h2>
                  {(selectedCategory || searchQuery || inStockOnly) && (
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setSearchQuery('');
                        setInStockOnly(false);
                      }}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-800 mb-2">
                    Search Catalog
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. Epoxy, PU Screed, 20L..."
                      className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-medium text-navy-950 transition-all placeholder:text-gray-400"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-md"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* In Stock Toggle */}
                <div className="mb-6 pb-5 border-b border-gray-100">
                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <span className="text-xs font-bold uppercase tracking-wider text-navy-800 flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-primary-500" />
                      In Stock Items Only
                    </span>
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Categories */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy-800 mb-3 flex items-center justify-between">
                    <span>Categories</span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {categories.length} Total
                    </span>
                  </h3>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                        !selectedCategory
                          ? 'bg-primary-50 text-primary-700 border border-primary-200/80 shadow-2xs'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>All Products</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        !selectedCategory ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {products.length}
                      </span>
                    </button>

                    {categories.map((category) => {
                      const count = categoryItemCounts[category.id] || 0;
                      const isSelected = selectedCategory === category.id;
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-primary-50 text-primary-700 border border-primary-200/80 shadow-2xs'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate pr-2">{category.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                            isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Technical Help Box */}
                <div className="mt-8 p-4 rounded-xl bg-navy-950 text-white text-xs space-y-2">
                  <p className="font-bold text-primary-300 uppercase tracking-wider text-[10px]">Need Technical Guidance?</p>
                  <p className="text-gray-300 leading-relaxed text-[11px]">
                    Unsure about coverage rates or primer compatibility? Speak with our floor engineers.
                  </p>
                  <Link href="/contact" className="inline-flex items-center gap-1 text-primary-400 font-bold hover:underline text-[11px] pt-1">
                    <span>Contact Technical Team</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </aside>

            {/* Products Main View */}
            <div className="flex-1">
              {/* Header Controls Bar */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 mb-6 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-600 font-medium">
                  {loading ? (
                    'Loading products...'
                  ) : (
                    <span>
                      Showing <strong className="text-navy-950">{filteredProducts.length}</strong> material{filteredProducts.length !== 1 ? 's' : ''}
                      {selectedCategory && ' in selected category'}
                    </span>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500 font-medium">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-navy-950 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  >
                    <option value="featured">Featured First</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name">Product Name (A-Z)</option>
                  </select>
                </div>
              </div>

              {/* Grid Content */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden p-4 space-y-3">
                      <div className="aspect-[4/3] bg-gray-100 rounded-xl animate-pulse" />
                      <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse" />
                      <div className="h-5 w-3/4 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                      <div className="flex items-center justify-between pt-2">
                        <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />
                        <div className="h-9 w-24 bg-gray-100 rounded-xl animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => {
                    const placeholder = getProductPlaceholder(
                      product.category?.slug || product.category?.name
                    );
                    const imageSrc = withFallback(product.image_url, placeholder);
                    const isAdded = addedItemIds[product.id];

                    return (
                      <div
                        key={product.id}
                        className="group bg-white rounded-2xl border border-gray-200/80 hover:border-primary-300 shadow-2xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          {/* Image Container */}
                          <Link href={`/product/${product.slug}`}>
                            <div className="relative aspect-[4/3] overflow-hidden bg-navy-950 cursor-pointer">
                              <img
                                src={imageSrc}
                                alt={product.name}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.src = placeholder;
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                              {/* Badges */}
                              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                                {product.featured ? (
                                  <span className="bg-primary-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Featured
                                  </span>
                                ) : (
                                  <span />
                                )}

                                {product.in_stock ? (
                                  <span className="bg-emerald-500/90 text-white backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                                    In Stock
                                  </span>
                                ) : (
                                  <span className="bg-navy-950/80 text-gray-300 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/10">
                                    Out of Stock
                                  </span>
                                )}
                              </div>

                              {/* SKU Code Overlay */}
                              {product.sku && (
                                <div className="absolute bottom-2.5 left-3 text-[10px] font-mono text-gray-300 bg-navy-950/70 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10">
                                  SKU: {product.sku}
                                </div>
                              )}
                            </div>
                          </Link>

                          {/* Product Info */}
                          <div className="p-5">
                            {product.category && (
                              <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider mb-1.5">
                                {product.category.name}
                              </p>
                            )}

                            <Link href={`/product/${product.slug}`}>
                              <h3 className="font-display font-bold text-navy-950 text-base group-hover:text-primary-600 transition-colors line-clamp-2 leading-snug mb-2">
                                {product.name}
                              </h3>
                            </Link>

                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-4">
                              {product.short_description || product.description}
                            </p>
                          </div>
                        </div>

                        {/* Price & Cart Footer */}
                        <div className="px-5 pb-5 pt-3 border-t border-gray-100/80 flex items-center justify-between gap-3 bg-gray-50/40">
                          <div>
                            <p className="font-display font-bold text-navy-950 text-base leading-none mb-0.5">
                              {formatKES(product.price)}
                            </p>
                            <p className="text-[10px] text-gray-500 font-medium">
                              per {product.unit || 'unit'}
                            </p>
                          </div>

                          <button
                            onClick={(e) => handleAddToCart(product, e)}
                            disabled={!product.in_stock}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isAdded
                                ? 'bg-emerald-600 text-white shadow-sm scale-105'
                                : product.in_stock
                                ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm shadow-primary-500/20 active:scale-95'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>Add to Cart</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 p-8 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="font-display font-bold text-navy-950 text-base mb-1">
                    No Materials Match Your Criteria
                  </h3>
                  <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                    Try adjusting your search terms, removing filters, or browsing all available product categories.
                  </p>
                  {(searchQuery || selectedCategory || inStockOnly) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                        setInStockOnly(false);
                      }}
                      className="px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-600 text-xs font-bold rounded-xl transition-colors"
                    >
                      Reset All Search Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}

