import { useState, useEffect } from "react";
import { AdminLayout } from './dashboard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  product_name?: string;
};

export default function ProductImages() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    product_id: "",
    image_url: "",
    alt_text: "",
    display_order: "0",
    is_primary: false,
  });
  const [images, setImages] = useState<ProductImage[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from('product_images')
      .select('*, products!inner(name)')
      .order('display_order');
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setImages(data.map((img: any) => ({
        ...img,
        product_name: img.products?.name,
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
    fetchImages();
    fetchProducts();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ product_id: "", image_url: "", alt_text: "", display_order: "0", is_primary: false });
    setOpen(true);
  };

  const openEdit = (img: ProductImage) => {
    setEditId(img.id);
    setForm({
      product_id: img.product_id,
      image_url: img.image_url,
      alt_text: img.alt_text || "",
      display_order: String(img.display_order),
      is_primary: img.is_primary,
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const data = {
      product_id: form.product_id,
      image_url: form.image_url,
      alt_text: form.alt_text || null,
      display_order: Number(form.display_order),
      is_primary: form.is_primary,
    };

    if (editId) {
      await supabase.from('product_images').update(data).eq('id', editId);
    } else {
      await supabase.from('product_images').insert(data);
    }
    fetchImages();
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this image?") || !supabase) return;
    await supabase.from('product_images').delete().eq('id', id);
    fetchImages();
  };

  const setF = (k: keyof typeof form, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const filteredImages = images.filter(img =>
    img.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    img.alt_text?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Catalog</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Product Images</h1>
        </div>
        <Button onClick={openCreate} className="rounded-sm font-sans uppercase tracking-widest text-xs h-9">
          <Plus className="h-3.5 w-3.5 mr-2" /> Add Image
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search images..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-sm text-sm" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-sm" />)}</div>
        ) : filteredImages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Image</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Product</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Alt Text</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Order</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Primary</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredImages.map(img => (
                  <tr key={img.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="h-16 w-16 rounded-sm bg-muted flex items-center justify-center overflow-hidden">
                        {img.image_url ? (
                          <img src={img.image_url} alt={img.alt_text || ""} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-foreground">{img.product_name || "—"}</td>
                    <td className="py-4 px-6 text-muted-foreground font-light text-xs">{img.alt_text || "—"}</td>
                    <td className="py-4 px-6 text-muted-foreground">{img.display_order}</td>
                    <td className="py-4 px-6">
                      {img.is_primary && <span className="inline-block px-2.5 py-0.5 rounded-sm text-xs font-sans border bg-primary/5 text-primary border-primary/20">Primary</span>}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm" onClick={() => openEdit(img)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm text-destructive hover:text-destructive" onClick={() => handleDelete(img.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">
            No images found.{" "}
            <button className="text-primary underline" onClick={openCreate}>Add one.</button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-sm">
          <DialogHeader>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Catalog</p>
            <DialogTitle className="font-display text-xl">{editId ? "Edit Image" : "New Image"}</DialogTitle>
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
              <Label className="text-xs uppercase tracking-widest font-sans">Image URL *</Label>
              <Input value={form.image_url} onChange={e => setF("image_url", e.target.value)} className="mt-1 rounded-sm" placeholder="https://..." required />
              {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-32 w-full object-cover rounded-sm border border-border" onError={e => (e.currentTarget.style.display = "none")} />}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Alt Text</Label>
              <Input value={form.alt_text} onChange={e => setF("alt_text", e.target.value)} className="mt-1 rounded-sm" placeholder="Image description" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Display Order</Label>
              <Input type="number" value={form.display_order} onChange={e => setF("display_order", e.target.value)} className="mt-1 rounded-sm" min={0} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_primary} onCheckedChange={v => setF("is_primary", v)} id="is_primary" />
              <Label htmlFor="is_primary" className="text-sm">Primary Image</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-sm font-sans uppercase tracking-widest text-xs">Cancel</Button>
              <Button type="submit" className="rounded-sm font-sans uppercase tracking-widest text-xs">
                {editId ? "Save Changes" : "Add Image"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
