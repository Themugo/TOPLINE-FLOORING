import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useListProducts, useListCategories } from "@/lib/api";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { formatKES } from "@/lib/utils";
import { Search, ShieldCheck, Wrench, Package } from "lucide-react";

type Tab = "all" | "service" | "material";

export default function Shop() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialCategory = params.get("category") ? Number(params.get("category")) : null;
  const initialTab = (params.get("type") as Tab) ?? "all";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(initialCategory);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const { data: categories } = useListCategories();
  const { data: products, isLoading } = useListProducts({
    categoryId: selectedCategory ?? undefined,
    search: search || undefined,
    productType: activeTab !== "all" ? (activeTab as "service" | "material") : undefined,
  });
  const { addToCart } = useCart();

  const tabs: { value: Tab; label: string; icon: typeof Wrench }[] = [
    { value: "all", label: "All", icon: ShieldCheck },
    { value: "service", label: "Services", icon: Wrench },
    { value: "material", label: "Materials", icon: Package },
  ];

  return (
    <CustomerLayout>
      <div className="bg-secondary text-secondary-foreground py-16 md:py-20 relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-6 bg-primary" />
            <span className="text-primary text-xs uppercase tracking-[0.2em] font-sans font-medium">Catalog</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-semibold text-white">Services &amp; Materials</h1>
          <p className="text-secondary-foreground/50 mt-3 font-light font-sans">Professional flooring and waterproofing solutions for every need</p>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-12">
        <div className="flex gap-1 mb-8 p-1 bg-muted rounded-sm w-fit">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setActiveTab(tab.value); setSelectedCategory(null); }}
              className={`flex items-center gap-2 px-5 py-2 rounded-sm text-[11px] font-sans uppercase tracking-[0.15em] transition-all ${
                activeTab === tab.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={activeTab === "material" ? "Search materials..." : "Search services..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-sm font-sans"
            />
          </div>
          {activeTab !== "all" && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-1.5 text-[11px] font-sans uppercase tracking-[0.15em] border transition-all rounded-sm ${
                  selectedCategory === null
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground bg-card"
                }`}
              >
                All
              </button>
              {categories?.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-1.5 text-[11px] font-sans uppercase tracking-[0.15em] border transition-all rounded-sm ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground bg-card"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-sm" />)}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map(product => (
              <div key={product.id} className="group bg-card border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 rounded-sm overflow-hidden flex flex-col">
                <div className="h-40 bg-muted flex items-center justify-center overflow-hidden relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="h-12 w-12 border border-primary/20 bg-primary/8 flex items-center justify-center rounded-sm">
                      {product.product_type === "material"
                        ? <Package className="h-6 w-6 text-primary/40" />
                        : <ShieldCheck className="h-6 w-6 text-primary/40" />
                      }
                    </div>
                  )}
                  <div className={`absolute top-2 left-2 px-2 py-0.5 text-[9px] uppercase tracking-widest font-sans border rounded-sm ${
                    product.product_type === "material"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-sky-50 text-sky-700 border-sky-200"
                  }`}>
                    {product.product_type === "material" ? "Material" : "Service"}
                  </div>
                  {!product.in_stock && (
                    <div className="absolute top-2 right-2 bg-foreground/75 text-background text-[9px] uppercase tracking-widest font-sans px-2 py-0.5">
                      Out of Stock
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  {product.category_name && (
                    <p className="text-[10px] text-primary uppercase tracking-[0.15em] font-sans font-medium mb-1.5">{product.category_name}</p>
                  )}
                  <h3 className="font-display text-base font-semibold text-foreground leading-tight mb-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-light flex-1 mb-4">{product.description}</p>
                  )}
                  <div className="pt-4 border-t border-border mt-auto">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="font-display font-semibold text-foreground">{formatKES(product.price)}</span>
                        {product.unit && <span className="text-[10px] text-muted-foreground ml-1 font-sans">/ {product.unit}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/shop/${product.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-[11px] rounded-sm h-8 font-sans uppercase tracking-wide">Details</Button>
                      </Link>
                      <Button
                        size="sm"
                        className="flex-1 text-[11px] rounded-sm h-8 font-sans uppercase tracking-wide"
                        disabled={!product.in_stock}
                        onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, unit: product.unit ?? null, imageUrl: product.image_url ?? null }, 1)}
                      >
                        {product.product_type === "material" ? "Buy" : "Book"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-28">
            <div className="h-14 w-14 border border-border flex items-center justify-center mx-auto mb-5 rounded-sm">
              {activeTab === "material" ? <Package className="h-6 w-6 text-muted-foreground/30" /> : <ShieldCheck className="h-6 w-6 text-muted-foreground/30" />}
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              {activeTab === "material" ? "No materials found" : "No services found"}
            </h3>
            <p className="text-sm text-muted-foreground font-light">Try adjusting your search or category filter.</p>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
