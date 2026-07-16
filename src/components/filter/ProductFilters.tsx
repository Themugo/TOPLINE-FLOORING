import { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface FilterOptions {
  priceRange?: { min: number; max: number };
  brands?: string[];
  materials?: string[];
  inStock?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isClearance?: boolean;
  sortBy?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest' | 'popular';
}

interface ProductFiltersProps {
  options: FilterOptions;
  onChange: (options: FilterOptions) => void;
  availableBrands?: string[];
  availableMaterials?: string[];
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Popular' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
];

export function ProductFilters({ 
  options, 
  onChange, 
  availableBrands = [], 
  availableMaterials = [] 
}: ProductFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    price: true,
    brands: true,
    materials: true,
    status: true,
    sort: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const hasActiveFilters = 
    options.priceRange ||
    (options.brands && options.brands.length > 0) ||
    (options.materials && options.materials.length > 0) ||
    options.inStock ||
    options.isNewArrival ||
    options.isBestSeller ||
    options.isClearance;

  const clearAllFilters = () => {
    onChange({});
  };

  const toggleBrand = (brand: string) => {
    const current = options.brands || [];
    const updated = current.includes(brand)
      ? current.filter(b => b !== brand)
      : [...current, brand];
    onChange({ ...options, brands: updated.length > 0 ? updated : undefined });
  };

  const toggleMaterial = (material: string) => {
    const current = options.materials || [];
    const updated = current.includes(material)
      ? current.filter(m => m !== material)
      : [...current, material];
    onChange({ ...options, materials: updated.length > 0 ? updated : undefined });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-navy-900 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Price Range */}
      <div className="border-b border-gray-100 pb-4">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-sm font-medium text-gray-700">Price Range</h3>
          {expandedSections.price ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {expandedSections.price && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={options.priceRange?.min || ''}
                onChange={(e) => {
                  const min = e.target.value ? Number(e.target.value) : undefined;
                  onChange({
                    ...options,
                    priceRange: { min: min || 0, max: options.priceRange?.max || 100000 }
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={options.priceRange?.max || ''}
                onChange={(e) => {
                  const max = e.target.value ? Number(e.target.value) : undefined;
                  onChange({
                    ...options,
                    priceRange: { min: options.priceRange?.min || 0, max: max || 100000 }
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {options.priceRange && (
              <button
                onClick={() => onChange({ ...options, priceRange: undefined })}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear price
              </button>
            )}
          </div>
        )}
      </div>

      {/* Brands */}
      {availableBrands.length > 0 && (
        <div className="border-b border-gray-100 pb-4">
          <button
            onClick={() => toggleSection('brands')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-sm font-medium text-gray-700">Brands</h3>
            {expandedSections.brands ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          {expandedSections.brands && (
            <div className="mt-3 space-y-2">
              {availableBrands.map((brand) => (
                <label key={brand} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.brands?.includes(brand) || false}
                    onChange={() => toggleBrand(brand)}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">{brand}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Materials */}
      {availableMaterials.length > 0 && (
        <div className="border-b border-gray-100 pb-4">
          <button
            onClick={() => toggleSection('materials')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-sm font-medium text-gray-700">Materials</h3>
            {expandedSections.materials ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          {expandedSections.materials && (
            <div className="mt-3 space-y-2">
              {availableMaterials.map((material) => (
                <label key={material} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.materials?.includes(material) || false}
                    onChange={() => toggleMaterial(material)}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">{material}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status */}
      <div className="border-b border-gray-100 pb-4">
        <button
          onClick={() => toggleSection('status')}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-sm font-medium text-gray-700">Status</h3>
          {expandedSections.status ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {expandedSections.status && (
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.inStock || false}
                onChange={(e) => onChange({ ...options, inStock: e.target.checked || undefined })}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">In Stock</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.isNewArrival || false}
                onChange={(e) => onChange({ ...options, isNewArrival: e.target.checked || undefined })}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">New Arrivals</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.isBestSeller || false}
                onChange={(e) => onChange({ ...options, isBestSeller: e.target.checked || undefined })}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Best Sellers</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.isClearance || false}
                onChange={(e) => onChange({ ...options, isClearance: e.target.checked || undefined })}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Clearance</span>
            </label>
          </div>
        )}
      </div>

      {/* Sort By */}
      <div>
        <button
          onClick={() => toggleSection('sort')}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-sm font-medium text-gray-700">Sort By</h3>
          {expandedSections.sort ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {expandedSections.sort && (
          <div className="mt-3 space-y-2">
            {SORT_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value={option.value}
                  checked={options.sortBy === option.value}
                   onChange={(e) => onChange({ ...options, sortBy: e.target.value as FilterOptions['sortBy'] })}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Active Filters
          </p>
          <div className="flex flex-wrap gap-2">
            {options.priceRange && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                KES {options.priceRange.min} - {options.priceRange.max}
                <button
                  onClick={() => onChange({ ...options, priceRange: undefined })}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {options.brands?.map((brand) => (
              <span key={brand} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                {brand}
                <button
                  onClick={() => toggleBrand(brand)}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {options.materials?.map((material) => (
              <span key={material} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                {material}
                <button
                  onClick={() => toggleMaterial(material)}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {options.inStock && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                In Stock
                <button
                  onClick={() => onChange({ ...options, inStock: undefined })}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {options.isNewArrival && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                New
                <button
                  onClick={() => onChange({ ...options, isNewArrival: undefined })}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {options.isBestSeller && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                Best Seller
                <button
                  onClick={() => onChange({ ...options, isBestSeller: undefined })}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {options.isClearance && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                Clearance
                <button
                  onClick={() => onChange({ ...options, isClearance: undefined })}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
