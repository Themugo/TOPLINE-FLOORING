import { useState, useEffect } from "react";
import { AdminLayout } from './dashboard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, FileText, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ProductDocument = {
  id: string;
  product_id: string;
  document_name: string;
  document_url: string;
  document_type: string;
  file_size: number | null;
  display_order: number;
  product_name?: string;
};

export default function ProductDocuments() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    product_id: "",
    document_name: "",
    document_url: "",
    document_type: "pdf",
    display_order: "0",
  });
  const [documents, setDocuments] = useState<ProductDocument[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from('product_documents')
      .select('*, products!inner(name)')
      .order('display_order');
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDocuments(data.map((doc: any) => ({
        ...doc,
        product_name: doc.products?.name,
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
    fetchDocuments();
    fetchProducts();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ product_id: "", document_name: "", document_url: "", document_type: "pdf", display_order: "0" });
    setOpen(true);
  };

  const openEdit = (doc: ProductDocument) => {
    setEditId(doc.id);
    setForm({
      product_id: doc.product_id,
      document_name: doc.document_name,
      document_url: doc.document_url,
      document_type: doc.document_type,
      display_order: String(doc.display_order),
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const data = {
      product_id: form.product_id,
      document_name: form.document_name,
      document_url: form.document_url,
      document_type: form.document_type,
      display_order: Number(form.display_order),
    };

    if (editId) {
      await supabase.from('product_documents').update(data).eq('id', editId);
    } else {
      await supabase.from('product_documents').insert(data);
    }
    fetchDocuments();
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?") || !supabase) return;
    await supabase.from('product_documents').delete().eq('id', id);
    fetchDocuments();
  };

  const setF = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const filteredDocuments = documents.filter(doc =>
    doc.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    doc.document_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Catalog</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Product Documents</h1>
        </div>
        <Button onClick={openCreate} className="rounded-sm font-sans uppercase tracking-widest text-xs h-9">
          <Plus className="h-3.5 w-3.5 mr-2" /> Add Document
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-sm text-sm" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-sm" />)}</div>
        ) : filteredDocuments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Product</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Document</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Type</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Order</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.map(doc => (
                  <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6 font-medium text-foreground">{doc.product_name || "—"}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{doc.document_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-block px-2.5 py-0.5 rounded-sm text-xs font-sans border bg-muted text-muted-foreground uppercase">
                        {doc.document_type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">{doc.display_order}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1">
                        <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm"><Download className="h-3.5 w-3.5" /></Button>
                        </a>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm" onClick={() => openEdit(doc)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm text-destructive hover:text-destructive" onClick={() => handleDelete(doc.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">
            No documents found.{" "}
            <button className="text-primary underline" onClick={openCreate}>Add one.</button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-sm">
          <DialogHeader>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Catalog</p>
            <DialogTitle className="font-display text-xl">{editId ? "Edit Document" : "New Document"}</DialogTitle>
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
              <Label className="text-xs uppercase tracking-widest font-sans">Document Name *</Label>
              <Input value={form.document_name} onChange={e => setF("document_name", e.target.value)} className="mt-1 rounded-sm" placeholder="e.g., Product Spec Sheet" required />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Document URL *</Label>
              <Input value={form.document_url} onChange={e => setF("document_url", e.target.value)} className="mt-1 rounded-sm" placeholder="https://..." required />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Document Type *</Label>
              <Select value={form.document_type} onValueChange={v => setF("document_type", v)}>
                <SelectTrigger className="mt-1 rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">DOC</SelectItem>
                  <SelectItem value="docx">DOCX</SelectItem>
                  <SelectItem value="xls">XLS</SelectItem>
                  <SelectItem value="xlsx">XLSX</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Display Order</Label>
              <Input type="number" value={form.display_order} onChange={e => setF("display_order", e.target.value)} className="mt-1 rounded-sm" min={0} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-sm font-sans uppercase tracking-widest text-xs">Cancel</Button>
              <Button type="submit" className="rounded-sm font-sans uppercase tracking-widest text-xs">
                {editId ? "Save Changes" : "Add Document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
