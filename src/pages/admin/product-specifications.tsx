import { useState, useEffect } from "react";
import { AdminLayout } from './dashboard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ProductSpecification = {
  id: string;
  product_id: string;
  spec_name: string;
  spec_value: string;
  display_order: number;
  product_name?: string;
};

export default function ProductSpecifications() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    product_id: "",
    spec_name: "",
    spec_value: "",
    display_order: "0",
  });
  const [specs, setSpecs] = useState<ProductSpecification[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSpecs = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from('product_specifications')
      .select('*, products!inner(name)')
      .order('display_order');
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSpecs(data.map((spec: any) => ({
        ...spec,
        product_name: spec.products?.name,
      })));
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (data) setProducts(data);
  };

  useEffect(() => {
    fetchSpecs();
    fetchProducts();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ product_id: "", spec_name: "", spec_value: "", display_order: "0" });
    setOpen(true);
  };

  const openEdit = (spec: ProductSpecification) => {
    setEditId(spec.id);
    setForm({
      product_id: spec.product_id,
      spec_name: spec.spec_name,
      spec_value: spec.spec_value,
      display_order: String(spec.display_order),
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const data = {
      product_id: form.product_id,
      spec_name: form.spec_name,
      spec_value: form.spec_value,
      display_order: Number(form.display_order),
    };

    if (editId) {
      await supabase.from('product_specifications').update(data).eq('id', editId);
    } else {
      await supabase.from('product_specifications').insert(data);
    }
    fetchSpecs();
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this specification?") || !supabase) return;
    await supabase.from('product_specifications').delete().eq('id', id);
    fetchSpecs();
  };

  const setF = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const filteredSpecs = specs.filter(spec =>
    spec.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    spec.spec_name.toLowerCase().includes(search.toLowerCase()) ||
    spec.spec_value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Catalog</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Product Specifications</h1>
        </div>
        <Button onClick={openCreate} className="rounded-sm font-sans uppercase tracking-widest text-xs h-9">
          <Plus className="h-3.5 w-3.5 mr-2" /> Add Specification
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search specifications..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-sm text-sm" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-sm" />)}</div>
        ) : filteredSpecs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Product</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Name</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Value</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Order</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSpecs.map(spec => (
                  <tr key={spec.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6 font-medium text-foreground">{spec.product_name || "—"}</td>
                    <td className="py-4 px-6 text-muted-foreground">{spec.spec_name}</td>
                    <td className="py-4 px-6 text-muted-foreground font-light text-xs">{spec.spec_value}</td>
                    <td className="py-4 px-6 text-muted-foreground">{spec.display_order}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm" onClick={() => openEdit(spec)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm text-destructive hover:text-destructive" onClick={() => handleDelete(spec.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">
            No specifications found.{" "}
            <button className="text-primary underline" onClick={openCreate}>Add one.</button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-sm">
          <DialogHeader>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Catalog</p>
            <DialogTitle className="font-display text-xl">{editId ? "Edit Specification" : "New Specification"}</DialogTitle>
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
              <Label className="text-xs uppercase tracking-widest font-sans">Specification Name *</Label>
              <Input value={form.spec_name} onChange={e => setF("spec_name", e.target.value)} className="mt-1 rounded-sm" placeholder="e.g., Thickness, Coverage" required />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Value *</Label>
              <Input value={form.spec_value} onChange={e => setF("spec_value", e.target.value)} className="mt-1 rounded-sm" placeholder="e.g., 3mm, 20 sqm" required />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Display Order</Label>
              <Input type="number" value={form.display_order} onChange={e => setF("display_order", e.target.value)} className="mt-1 rounded-sm" min={0} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-sm font-sans uppercase tracking-widest text-xs">Cancel</Button>
              <Button type="submit" className="rounded-sm font-sans uppercase tracking-widest text-xs">
                {editId ? "Save Changes" : "Add Specification"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
