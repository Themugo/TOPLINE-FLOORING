import { useState } from "react";
import { useListProducts, useListCategories, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/lib/api";
import type { Product, ProductInsert, ProductUpdate, Category } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatKES } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, ShieldCheck, Package, Wrench } from "lucide-react";

type ProductForm = {
  name: string; slug: string; description: string; price: string; unit: string;
  image_url: string; gallery_urls: string[]; category_id: string; product_type: "service" | "material";
  in_stock: boolean; featured: boolean; sku: string; stock_quantity: string;
  low_stock_threshold: string; meta_title: string; meta_description: string;
  brand_id: string; specifications: { name: string; value: string }[];
  documents: { name: string; url: string; type: string }[];
  related_products: string[];
};

const emptyForm: ProductForm = {
  name: "", slug: "", description: "", price: "", unit: "", image_url: "", gallery_urls: [],
  category_id: "", product_type: "service", in_stock: true, featured: false,
  sku: "", stock_quantity: "0", low_stock_threshold: "5", meta_title: "", meta_description: "",
  brand_id: "", specifications: [], documents: [], related_products: [],
};

function toSlug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "service" | "material">("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useListProducts({
    search: search || undefined,
    productType: typeFilter !== "all" ? (typeFilter as "service" | "material") : undefined,
  });
  const { data: categories } = useListCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['products'] });

  const openCreate = (type?: "service" | "material") => {
    setEditId(null);
    setForm({ ...emptyForm, product_type: type ?? "service" });
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name, slug: p.slug, description: p.description ?? "", price: String(p.price),
      unit: p.unit ?? "", image_url: p.image_url ?? "", category_id: String(p.category_id ?? ""),
      product_type: p.product_type as "service" | "material", in_stock: p.in_stock, featured: p.featured,
      sku: p.sku ?? "", stock_quantity: String(p.stock_quantity ?? 0), low_stock_threshold: String(p.low_stock_threshold ?? 5),
      meta_title: p.meta_title ?? "", meta_description: p.meta_description ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: ProductInsert = {
      name: form.name, slug: form.slug, description: form.description || null,
      price: Number(form.price), unit: form.unit || null, image_url: form.image_url || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      product_type: form.product_type,
      in_stock: form.in_stock, featured: form.featured,
      sku: form.sku || null, stock_quantity: Number(form.stock_quantity), low_stock_threshold: Number(form.low_stock_threshold),
      meta_title: form.meta_title || null, meta_description: form.meta_description || null,
    };
    if (editId) {
      updateProduct.mutate({ id: editId, data: data as ProductUpdate }, { onSuccess: () => { invalidate(); setOpen(false); } });
    } else {
      createProduct.mutate({ data }, { onSuccess: () => { invalidate(); setOpen(false); } });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this product?")) return;
    deleteProduct.mutate(id, { onSuccess: invalidate });
  };

  const setF = (k: keyof ProductForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Catalog</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Products</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openCreate("service")} variant="outline" className="rounded-sm font-sans uppercase tracking-widest text-xs h-9">
            <Wrench className="h-3.5 w-3.5 mr-2" /> Add Service
          </Button>
          <Button onClick={() => openCreate("material")} className="rounded-sm font-sans uppercase tracking-widest text-xs h-9">
            <Package className="h-3.5 w-3.5 mr-2" /> Add Material
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-sm text-sm" />
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-sm w-fit">
          {(["all", "service", "material"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-sm text-[11px] font-sans uppercase tracking-[0.15em] transition-all ${
                typeFilter === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "All" : t === "service" ? "Services" : "Materials"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-sm" />)}</div>
        ) : products && products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Product</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Type</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Category</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Price</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Status</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Featured</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-sm bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                            : p.product_type === "material"
                              ? <Package className="h-4 w-4 text-muted-foreground/40" />
                              : <ShieldCheck className="h-4 w-4 text-muted-foreground/40" />
                          }
                        </div>
                        <p className="font-medium text-foreground">{p.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-2.5 py-0.5 rounded-sm text-xs font-sans border ${
                        p.product_type === "material"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-sky-50 text-sky-700 border-sky-200"
                      }`}>
                        {p.product_type === "material" ? "Material" : "Service"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground font-light text-xs">{p.category_name ?? "—"}</td>
                    <td className="py-4 px-6">
                      <span className="font-display font-semibold text-foreground">{formatKES(p.price)}</span>
                      {p.unit && <span className="text-xs text-muted-foreground font-light ml-1">/{p.unit}</span>}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-2.5 py-0.5 rounded-sm text-xs font-sans border ${p.in_stock ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                        {p.in_stock ? "In Stock" : "Out of Stock"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {p.featured && <span className="inline-block px-2.5 py-0.5 rounded-sm text-xs font-sans border bg-primary/5 text-primary border-primary/20">Featured</span>}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">
            No products found.{" "}
            <button className="text-primary underline" onClick={() => openCreate()}>Add one.</button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-sm">
          <DialogHeader>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Catalog</p>
            <DialogTitle className="font-display text-xl">{editId ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs uppercase tracking-widest font-sans">Type *</Label>
                <div className="flex gap-2 mt-1">
                  {(["service", "material"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setF("product_type", t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 border rounded-sm text-xs font-sans uppercase tracking-widest transition-all ${
                        form.product_type === t
                          ? t === "service" ? "bg-sky-50 border-sky-300 text-sky-700" : "bg-amber-50 border-amber-300 text-amber-700"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {t === "service" ? <Wrench className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <Label className="text-xs uppercase tracking-widest font-sans">Name *</Label>
                <Input value={form.name} onChange={e => { setF("name", e.target.value); if (!editId) setF("slug", toSlug(e.target.value)); }} className="mt-1 rounded-sm" required />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Slug *</Label>
                <Input value={form.slug} onChange={e => setF("slug", e.target.value)} className="mt-1 rounded-sm" required />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Category</Label>
                <Select value={form.category_id} onValueChange={v => setF("category_id", v)}>
                  <SelectTrigger className="mt-1 rounded-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Price (KES) *</Label>
                <Input type="number" value={form.price} onChange={e => setF("price", e.target.value)} className="mt-1 rounded-sm" required min={0} step={1} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Unit</Label>
                <Input value={form.unit} onChange={e => setF("unit", e.target.value)} className="mt-1 rounded-sm" placeholder={form.product_type === "material" ? "per bag, per roll..." : "per sqm, per service..."} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">SKU</Label>
                <Input value={form.sku} onChange={e => setF("sku", e.target.value)} className="mt-1 rounded-sm" placeholder="PROD-001" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Stock Quantity</Label>
                <Input type="number" value={form.stock_quantity} onChange={e => setF("stock_quantity", e.target.value)} className="mt-1 rounded-sm" min={0} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Low Stock Threshold</Label>
                <Input type="number" value={form.low_stock_threshold} onChange={e => setF("low_stock_threshold", e.target.value)} className="mt-1 rounded-sm" min={0} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs uppercase tracking-widest font-sans">Description</Label>
                <Textarea value={form.description} onChange={e => setF("description", e.target.value)} className="mt-1 rounded-sm" rows={3} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs uppercase tracking-widest font-sans">Image URL</Label>
                <Input value={form.image_url} onChange={e => setF("image_url", e.target.value)} className="mt-1 rounded-sm" placeholder="https://..." />
                {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-20 w-20 object-cover rounded-sm border border-border" onError={e => (e.currentTarget.style.display = "none")} />}
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.in_stock} onCheckedChange={v => setF("in_stock", v)} id="in_stock" />
                <Label htmlFor="in_stock" className="text-sm">In Stock</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.featured} onCheckedChange={v => setF("featured", v)} id="featured" />
                <Label htmlFor="featured" className="text-sm">Featured</Label>
              </div>
              <div className="col-span-2">
                <Label className="text-xs uppercase tracking-widest font-sans">SEO Title</Label>
                <Input value={form.meta_title} onChange={e => setF("meta_title", e.target.value)} className="mt-1 rounded-sm" placeholder="Page title for SEO" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs uppercase tracking-widest font-sans">SEO Description</Label>
                <Textarea value={form.meta_description} onChange={e => setF("meta_description", e.target.value)} className="mt-1 rounded-sm" rows={2} placeholder="Meta description for search engines" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-sm font-sans uppercase tracking-widest text-xs">Cancel</Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending} className="rounded-sm font-sans uppercase tracking-widest text-xs">
                {editId ? "Save Changes" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
