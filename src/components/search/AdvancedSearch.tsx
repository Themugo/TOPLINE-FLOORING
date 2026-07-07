 import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { useProducts } from '@/hooks/use-data';
import { formatKES } from '@/lib/utils';

const SEARCH_HISTORY_KEY = 'topline_search_history';
const MAX_HISTORY = 5;

interface AdvancedSearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export function AdvancedSearch({ placeholder = 'Search products...', onSearch }: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { products: searchResults } = useProducts(
    query.length >= 2 ? { search: query } : undefined
  );

  const popularSearches = ['flooring', 'tiles', 'waterproofing', 'vinyl', 'laminate', 'ceramic'];

  useEffect(() => {
    try {
      const history = localStorage.getItem(SEARCH_HISTORY_KEY);
      setSearchHistory(history ? JSON.parse(history) : []);
    } catch {
      setSearchHistory([]);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addToHistory = (searchTerm: string) => {
    const updated = [searchTerm, ...searchHistory.filter(h => h !== searchTerm)].slice(0, MAX_HISTORY);
    setSearchHistory(updated);
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleSearch = (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (trimmed) {
      addToHistory(trimmed);
      setQuery(trimmed);
      setIsOpen(false);
      onSearch?.(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const results = searchResults || [];
    const historyItems = query.length < 2 ? searchHistory : [];
    const totalItems = results.length + historyItems.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        if (selectedIndex < results.length) {
          handleSearch(results[selectedIndex].name);
        } else {
          handleSearch(historyItems[selectedIndex - results.length]);
        }
      } else {
        handleSearch(query);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  const clearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Ignore
    }
  };

  const displayResults = (searchResults || []).slice(0, 5);
  const displayHistory = query.length < 2 ? searchHistory.slice(0, 5) : [];

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
          aria-label="Search products"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-[500px] overflow-y-auto">
          {/* Search Results */}
          {query.length >= 2 && displayResults.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Products
              </p>
              {displayResults.map((product, idx) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  onClick={() => handleSearch(product.name)}
                  className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                    selectedIndex === idx ? 'bg-gray-50' : ''
                  }`}
                >
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-navy-900 truncate">{product.name}</p>
                    {product.category && (
                      <p className="text-sm text-gray-500">{product.category.name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-navy-900">{formatKES(product.price)}</p>
                    {product.unit && (
                      <p className="text-xs text-gray-500">/ {product.unit}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Search History */}
          {query.length < 2 && displayHistory.length > 0 && (
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Recent Searches
                </p>
                <button
                  onClick={clearHistory}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear
                </button>
              </div>
              {displayHistory.map((term, idx) => (
                <button
                  key={term}
                  onClick={() => handleSearch(term)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left ${
                    selectedIndex === idx ? 'bg-gray-50' : ''
                  }`}
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-navy-900">{term}</span>
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {query.length < 2 && (
            <div className="p-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Popular Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSearch(term)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-navy-900 transition-colors"
                  >
                    <TrendingUp className="w-3 h-3" />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {query.length >= 2 && displayResults.length === 0 && (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No products found for "{query}"</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
            </div>
          )}

          {/* View All Results */}
          {query.length >= 2 && displayResults.length > 0 && (
            <div className="p-4 border-t border-gray-100">
              <Link
                href={`/shop?search=${encodeURIComponent(query)}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                View all results
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
