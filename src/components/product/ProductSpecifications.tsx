import { useState } from 'react';
import { FileText, Download, Info, Shield, Ruler, Droplets, Flame } from 'lucide-react';
import type { Product, ProductSpecification, ProductDocument } from '@/lib/types';

interface ProductSpecificationsProps {
  product: Product;
  specifications?: ProductSpecification[];
  documents?: ProductDocument[];
}

export function ProductSpecifications({ product, specifications = [], documents = [] }: ProductSpecificationsProps) {
  const [activeTab, setActiveTab] = useState('description');

  const tabs = [
    { id: 'description', label: 'Description', icon: Info },
    { id: 'specifications', label: 'Specifications', icon: Ruler },
    { id: 'downloads', label: 'Downloads', icon: FileText },
    ...(product.warranty_description ? [{ id: 'warranty', label: 'Warranty', icon: Shield }] : []),
  ];

  const specGroups = [
    {
      title: 'Product Details',
      specs: [
        ...(product.material ? [{ name: 'Material', value: product.material }] : []),
        ...(product.collection ? [{ name: 'Collection', value: product.collection }] : []),
        ...(product.origin_country ? [{ name: 'Origin', value: product.origin_country }] : []),
        ...(product.barcode ? [{ name: 'Barcode', value: product.barcode }] : []),
      ],
    },
    {
      title: 'Physical Properties',
      specs: [
        ...(product.thickness_mm ? [{ name: 'Thickness', value: `${product.thickness_mm}mm` }] : []),
        ...(product.weight_kg ? [{ name: 'Weight', value: `${product.weight_kg}kg` }] : []),
        ...(product.dimensions ? [{ name: 'Dimensions', value: product.dimensions }] : []),
        ...(product.pack_size ? [{ name: 'Pack Size', value: product.pack_size }] : []),
        ...(product.coverage_per_unit ? [{ name: 'Coverage', value: product.coverage_per_unit }] : []),
      ],
    },
    {
      title: 'Installation',
      specs: [
        ...(product.installation_method ? [{ name: 'Installation Method', value: product.installation_method }] : []),
        ...(product.is_indoor !== undefined ? [{ name: 'Indoor Use', value: product.is_indoor ? 'Yes' : 'No' }] : []),
        ...(product.is_outdoor !== undefined ? [{ name: 'Outdoor Use', value: product.is_outdoor ? 'Yes' : 'No' }] : []),
        ...(product.room_suitability?.length ? [{ name: 'Room Suitability', value: product.room_suitability.join(', ') }] : []),
      ],
    },
    {
      title: 'Performance Ratings',
      specs: [
        ...(product.slip_rating ? [{ name: 'Slip Rating', value: product.slip_rating }] : []),
        ...(product.water_resistance ? [{ name: 'Water Resistance', value: product.water_resistance, icon: Droplets }] : []),
        ...(product.abrasion_rating ? [{ name: 'Abrasion Rating', value: product.abrasion_rating }] : []),
        ...(product.fire_rating ? [{ name: 'Fire Rating', value: product.fire_rating, icon: Flame }] : []),
      ],
    },
  ].filter(group => group.specs.length > 0);

  const customSpecs = specifications.filter(s => 
    !specGroups.some(g => g.specs.some(gs => gs.name.toLowerCase() === s.spec_name.toLowerCase()))
  );

  if (customSpecs.length > 0) {
    specGroups.push({
      title: 'Additional Specifications',
      specs: customSpecs.map(s => ({ name: s.spec_name, value: s.spec_value })),
    });
  }

  return (
    <div className="border-t border-gray-200 pt-8">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === 'description' && (
          <div className="prose prose-sm max-w-none">
            {product.description ? (
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </div>
            ) : (
              <p className="text-gray-400">No description available.</p>
            )}
          </div>
        )}

        {activeTab === 'specifications' && (
          <div className="space-y-6">
            {specGroups.length > 0 ? (
              specGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="font-semibold text-navy-900 mb-3">{group.title}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.specs.map((spec, idx) => (
                      <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-sm flex items-center gap-2">
                          {spec.icon && <spec.icon className="w-4 h-4" />}
                          {spec.name}
                        </span>
                        <span className="font-medium text-navy-900 text-sm">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No specifications available.</p>
            )}
          </div>
        )}

        {activeTab === 'downloads' && (
          <div className="space-y-3">
            {documents.length > 0 ? (
              documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-navy-900 text-sm">{doc.document_name}</p>
                      <p className="text-xs text-gray-500 uppercase">{doc.document_type}</p>
                    </div>
                  </div>
                  <Download className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                </a>
              ))
            ) : (
              <p className="text-gray-400">No downloads available.</p>
            )}
          </div>
        )}

        {activeTab === 'warranty' && (
          <div className="space-y-4">
            {product.warranty_years && (
              <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-lg">
                <Shield className="w-6 h-6 text-primary-600" />
                <div>
                  <p className="font-semibold text-navy-900">{product.warranty_years} Year Warranty</p>
                  <p className="text-sm text-gray-600">Manufacturer warranty coverage</p>
                </div>
              </div>
            )}
            {product.warranty_description && (
              <div className="prose prose-sm max-w-none text-gray-600">
                {product.warranty_description}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
