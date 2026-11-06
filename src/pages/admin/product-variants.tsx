import { dbFailure, describeDbError } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from "react";
import { AdminLayout } from './dashboard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ProductVariant = {
  id: string;
  product_id: string;
  variant_name: string;
  sku: string | null;
  price_adjustment: number;
  stock_quantity: number;
  attributes: Record<string, unknown>;
  display_order: number;
  is_active: boolean;
  product_name?: string;
};

export default function ProductVariants() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    product_id: "",
    variant_name: "",
    sku: "",
    price_adjustment: "0",
    stock_quantity: "0",
    attributes: "{}",
    display_order: "0",
    is_active: true,
  });
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchVariants = async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*, products!inner(name)')
        .order('display_order');
      if (error) throw error;
      setVariants((data || []).map((variant: ProductVariant & { products?: { name?: string | null } | null }) => ({
        ...variant,
        product_name: variant.products?.name ?? undefined,
      })));
    } catch (err) {
      toast({ title: 'Could not load variants', description: describeDbError(err as { message?: string; code?: string }), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (error) {
      toast({ title: 'Could not load products for variants', description: describeDbError(error), variant: 'destructive' });
      return;
    }
    setProducts(data || []);
  };

  useEffect(() => {
    fetchVariants();
    fetchProducts();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ product_id: "", variant_name: "", sku: "", price_adjustment: "0", stock_quantity: "0", attributes: "{}", display_order: "0", is_active: true });
    setOpen(true);
  };

  const openEdit = (variant: ProductVariant) => {
    setEditId(variant.id);
    setForm({
      product_id: variant.product_id,
      variant_name: variant.variant_name,
      sku: variant.sku || "",
      price_adjustment: String(variant.price_adjustment),
      stock_quantity: String(variant.stock_quantity),
      attributes: typeof variant.attributes === 'string' ? variant.attributes : JSON.stringify(variant.attributes),
      display_order: String(variant.display_order),
      is_active: variant.is_active,
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || saving) return;

    let attributes: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(form.attributes);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Attributes must be a JSON object.');
      attributes = parsed as Record<string, unknown>;
    } catch (parseError) {
      toast({ title: 'Invalid attributes', description: `Enter a valid JSON object (for example {"finish":"matte"}). ${String(parseError).slice(0, 140)}`, variant: 'destructive' });
      return;
    }

    const priceAdjustment = Number(form.price_adjustment);
    const desiredStock = Number(form.stock_quantity);
    const displayOrder = Number(form.display_order);
    if (!form.product_id || !form.variant_name.trim()) {
      toast({ title: 'Product and variant name are required', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(priceAdjustment) || !Number.isInteger(desiredStock) || desiredStock < 0 || !Number.isInteger(displayOrder)) {
      toast({ title: 'Check the variant numbers', description: 'Price adjustment must be valid; stock and display order must be whole numbers, and stock cannot be negative.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const data = {
        product_id: form.product_id,
        variant_name: form.variant_name.trim(),
        sku: form.sku.trim() || null,
        price_adjustment: priceAdjustment,
        attributes,
        display_order: displayOrder,
        is_active: form.is_active,
      };

      let variantId = editId;
      if (editId) {
        const { error } = await supabase.from('product_variants').update(data).eq('id', editId).select('id').single();
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from('product_variants')
          .insert({ ...data, stock_quantity: 0 })
          .select('id').single();
        if (error) throw error;
        variantId = created.id;
      }

      if (!variantId) throw new Error('Variant could not be identified after saving.');
      const previousStock = editId
        ? (variants.find((variant) => variant.id === editId)?.stock_quantity ?? 0)
        : 0;
      if (desiredStock !== previousStock) {
        const { error: stockError } = await supabase.rpc('set_product_variant_stock', {
          p_variant_id: variantId,
          p_quantity: desiredStock,
          p_notes: editId ? 'Variant stock count from product variant editor' : 'Opening variant stock',
        });
        if (stockError) {
          toast({ title: editId ? 'Variant details saved; stock was not updated' : 'Variant created; opening stock was not recorded', description: describeDbError(stockError as { message?: string; code?: string }) || 'Use Inventory to retry the stock count.', variant: 'destructive' });
          await fetchVariants();
          return;
        }
      }

      toast({ title: editId ? 'Variant updated' : 'Variant created', description: desiredStock !== previousStock ? 'Stock changes were recorded in the inventory movement ledger.' : undefined });
      await fetchVariants();
      setOpen(false);
    } catch (err) {
      toast({ title: 'Save failed', description: describeDbError(err as { message?: string; code?: string }), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    const variant = variants.find((item) => item.id === id);
    if (!variant) return;
    if (variant.stock_quantity > 0) {
      toast({ title: 'Stock must be cleared first', description: 'Record an audited stock adjustment to zero before archiving this variant.', variant: 'destructive' });
      return;
    }
    if (!confirm("Archive this variant? Its inventory and order history will be preserved.")) return;
    const failure = await dbFailure(
      supabase.from('product_variants').update({ is_active: false }).eq('id', id).select('id'),
      { requireRows: true },
    );
    if (failure) {
      toast({ title: 'Archive failed', description: failure, variant: 'destructive' });
      return;
    }
    toast({ title: 'Variant archived' });
    await fetchVariants();
  };

  const setF = (k: keyof typeof form, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const filteredVariants = variants.filter(variant =>
    variant.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    variant.variant_name.toLowerCase().includes(search.toLowerCase()) ||
    variant.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Catalog</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Product Variants</h1>
        </div>
        <Button onClick={openCreate} className="rounded-sm font-sans uppercase tracking-widest text-xs h-9">
          <Plus className="h-3.5 w-3.5 mr-2" /> Add Variant
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search variants..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-sm text-sm" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-sm" />)}</div>
        ) : filteredVariants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Product</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Variant</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">SKU</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Price Adj.</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Stock</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Active</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVariants.map(variant => (
                  <tr key={variant.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6 font-medium text-foreground">{variant.product_name || "—"}</td>
                    <td className="py-4 px-6 text-muted-foreground">{variant.variant_name}</td>
                    <td className="py-4 px-6 text-muted-foreground font-light text-xs">{variant.sku || "—"}</td>
                    <td className="py-4 px-6 text-muted-foreground">{variant.price_adjustment > 0 ? `+KES ${variant.price_adjustment}` : variant.price_adjustment < 0 ? `KES ${variant.price_adjustment}` : "—"}</td>
                    <td className="py-4 px-6 text-muted-foreground">{variant.stock_quantity}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-2.5 py-0.5 rounded-sm text-xs font-sans border ${variant.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                        {variant.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm" onClick={() => openEdit(variant)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm text-destructive hover:text-destructive" onClick={() => handleDelete(variant.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">
            No variants found.{" "}
            <button className="text-primary underline" onClick={openCreate}>Add one.</button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-sm">
          <DialogHeader>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Catalog</p>
            <DialogTitle className="font-display text-xl">{editId ? "Edit Variant" : "New Variant"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Product *</Label>
              <Select value={form.product_id} onValueChange={v => setF("product_id", v)}>
                <SelectTrigger className="mt-1 rounded-sm"><SelectValue placeholder="Select product..." /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Variant Name *</Label>
              <Input value={form.variant_name} onChange={e => setF("variant_name", e.target.value)} className="mt-1 rounded-sm" placeholder="e.g., Red, Large, 20kg" required />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">SKU</Label>
              <Input value={form.sku} onChange={e => setF("sku", e.target.value)} className="mt-1 rounded-sm" placeholder="VAR-001" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Price Adjustment (KES)</Label>
              <Input type="number" value={form.price_adjustment} onChange={e => setF("price_adjustment", e.target.value)} className="mt-1 rounded-sm" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Counted Stock Quantity</Label>
              <Input type="number" value={form.stock_quantity} onChange={e => setF("stock_quantity", e.target.value)} className="mt-1 rounded-sm" min={0} step={1} required />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Attributes (JSON)</Label>
              <Textarea value={form.attributes} onChange={e => setF("attributes", e.target.value)} className="mt-1 rounded-sm" rows={3} placeholder='{"color": "red", "size": "large"}' />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Display Order</Label>
              <Input type="number" value={form.display_order} onChange={e => setF("display_order", e.target.value)} className="mt-1 rounded-sm" min={0} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setF("is_active", v)} id="is_active" />
              <Label htmlFor="is_active" className="text-sm">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-sm font-sans uppercase tracking-widest text-xs">Cancel</Button>
              <Button type="submit" className="rounded-sm font-sans uppercase tracking-widest text-xs">
                {editId ? "Save Changes" : "Add Variant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
