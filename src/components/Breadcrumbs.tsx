import { Link } from "wouter";
import { ChevronRight, Home } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="bg-gray-50/80 border-b border-gray-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <ol className="flex items-center flex-wrap gap-1.5 text-xs text-gray-500 font-medium">
          <li>
            <Link href="/" className="hover:text-primary-600 transition-colors flex items-center gap-1.5 text-gray-500 hover:underline">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
          </li>
          {items.map((item, i) => (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              {item.href && i < items.length - 1 ? (
                <Link href={item.href} className="hover:text-primary-600 transition-colors text-gray-600 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className="text-navy-950 font-bold truncate max-w-[200px] sm:max-w-xs" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

