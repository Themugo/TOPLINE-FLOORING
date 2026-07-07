import { useState } from 'react';
import { X, Check, ArrowRight, Share2 } from 'lucide-react';
import { Link } from 'wouter';
import { formatKES } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface ProductComparisonProps {
  products: Product[];
  onRemove: (productId: string) => void;
  onClearAll: () => void;
}

export function ProductComparison({ products, onRemove, onClearAll }: ProductComparisonProps) {
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([
    'material',
    'thickness_mm',
    'dimensions',
    'installation_method',
    'water_resistance',
    'warranty_years',
  ]);

  const specs = [
    { key: 'material', label: 'Material' },
    { key: 'thickness_mm', label: 'Thickness' },
    { key: 'dimensions', label: 'Dimensions' },
    { key: 'installation_method', label: 'Installation' },
    { key: 'water_resistance', label: 'Water Resistance' },
    { key: 'warranty_years', label: 'Warranty (Years)' },
    { key: 'slip_rating', label: 'Slip Rating' },
    { key: 'fire_rating', label: 'Fire Rating' },
    { key: 'abrasion_rating', label: 'Abrasion Rating' },
    { key: 'origin_country', label: 'Origin' },
  ];

  const toggleSpec = (key: string) => {
    setSelectedSpecs(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const getSpecValue = (product: Product, key: string) => {
    const value = product[key as keyof Product];
    if (value === null || value === undefined) return '-';
    if (key === 'thickness_mm') return `${value}mm`;
    if (key === 'warranty_years') return `${value} years`;
    return String(value);
  };

  const getSpecIcon = (key: string) => {
    switch (key) {
      case 'water_resistance':
        return <span className="text-blue-500">💧</span>;
      case 'fire_rating':
        return <span className="text-orange-500">🔥</span>;
      case 'slip_rating':
        return <span className="text-green-500">🦶</span>;
      default:
        return null;
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500 mb-2">No products to compare</p>
        <p className="text-sm text-gray-400">Add products from the shop to compare them side-by-side</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="font-display text-xl font-bold text-navy-900">
          Compare Products ({products.length})
        </h2>
        <button
          onClick={onClearAll}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Spec Selector */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Select Specifications to Compare
        </p>
        <div className="flex flex-wrap gap-2">
          {specs.map((spec) => (
            <button
              key={spec.key}
              onClick={() => toggleSpec(spec.key)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                selectedSpecs.includes(spec.key)
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {spec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-4 text-left font-medium text-gray-700 bg-gray-50 min-w-[150px]">
                Product
              </th>
              {products.map((product) => (
                <th key={product.id} className="p-4 min-w-[200px]">
                  <div className="relative">
                    <button
                      onClick={() => onRemove(product.id)}
                      className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                      aria-label="Remove product"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}
                    <Link
                      href={`/product/${product.slug}`}
                      className="font-semibold text-navy-900 hover:text-primary-600 transition-colors line-clamp-2"
                    >
                      {product.name}
                    </Link>
                    {product.category && (
                      <p className="text-xs text-gray-500 mt-1">{product.category.name}</p>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price */}
            <tr className="border-t border-gray-100">
              <td className="p-4 font-medium text-gray-700 bg-gray-50">Price</td>
              {products.map((product) => (
                <td key={product.id} className="p-4">
                  <div className="space-y-1">
                    <p className="font-bold text-navy-900 text-lg">
                      {formatKES(product.price)}
                    </p>
                    {product.unit && (
                      <p className="text-xs text-gray-500">per {product.unit}</p>
                    )}
                    {product.sale_price && (
                      <p className="text-xs text-red-600 line-through">
                        {formatKES(product.sale_price)}
                      </p>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Stock Status */}
            <tr className="border-t border-gray-100">
              <td className="p-4 font-medium text-gray-700 bg-gray-50">Availability</td>
              {products.map((product) => (
                <td key={product.id} className="p-4">
                  {product.stock_quantity > 0 ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="w-4 h-4" />
                      <span className="text-sm">In Stock</span>
                    </div>
                  ) : (
                    <span className="text-sm text-red-600">Out of Stock</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Specifications */}
            {selectedSpecs.map((specKey) => {
              const spec = specs.find(s => s.key === specKey);
              if (!spec) return null;
              
              return (
                <tr key={specKey} className="border-t border-gray-100">
                  <td className="p-4 font-medium text-gray-700 bg-gray-50">
                    <div className="flex items-center gap-2">
                      {getSpecIcon(specKey)}
                      {spec.label}
                    </div>
                  </td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-sm">
                      {getSpecValue(product, specKey)}
                    </td>
                  ))}
                </tr>
              );
            })}

            {/* Description */}
            <tr className="border-t border-gray-100">
              <td className="p-4 font-medium text-gray-700 bg-gray-50">Description</td>
              {products.map((product) => (
                <td key={product.id} className="p-4 text-sm text-gray-600 line-clamp-3">
                  {product.short_description || product.description || '-'}
                </td>
              ))}
            </tr>

            {/* Features */}
            <tr className="border-t border-gray-100">
              <td className="p-4 font-medium text-gray-700 bg-gray-50">Features</td>
              {products.map((product) => (
                <td key={product.id} className="p-4">
                  <div className="space-y-1">
                    {product.is_new_arrival && (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        New Arrival
                      </span>
                    )}
                    {product.is_best_seller && (
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                        Best Seller
                      </span>
                    )}
                    {product.is_clearance && (
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        Clearance
                      </span>
                    )}
                    {!product.is_new_arrival && !product.is_best_seller && !product.is_clearance && (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Action */}
            <tr className="border-t border-gray-200 bg-gray-50">
              <td className="p-4 font-medium text-gray-700">Action</td>
              {products.map((product) => (
                <td key={product.id} className="p-4">
                  <Link
                    href={`/product/${product.slug}`}
                    className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                  >
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Comparing {products.length} of 4 maximum products
        </p>
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
          <Share2 className="w-4 h-4" />
          Share Comparison
        </button>
      </div>
    </div>
  );
}
