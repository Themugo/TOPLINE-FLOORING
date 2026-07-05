import { useState } from "react";
import { useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/lib/api";
import type { Category, CategoryInsert, CategoryUpdate } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { formatDate } from "@/lib/utils";

type CatForm = { name: string; slug: string; description: string };
const emptyForm: CatForm = { name: "", slug: "", description: "" };
function toSlug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export default function AdminCategories() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CatForm>(emptyForm);
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useListCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c: Category) => {
    setEditId(c.id);
    setForm({ name: c.name, slug: c.slug, description: c.description ?? "" });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: CategoryInsert = { name: form.name, slug: form.slug, description: form.description || null };
    if (editId) {
      updateCategory.mutate({ id: editId, data: data as CategoryUpdate }, { onSuccess: () => { invalidate(); setOpen(false); } });
    } else {
      createCategory.mutate({ data }, { onSuccess: () => { invalidate(); setOpen(false); } });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this category? Products in this category will be affected.")) return;
    deleteCategory.mutate(id, { onSuccess: invalidate });
  };

  const setF = (k: keyof CatForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Catalog</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Categories</h1>
        </div>
        <Button onClick={openCreate} className="rounded-sm font-sans uppercase tracking-widest text-xs h-9">
          <Plus className="h-3.5 w-3.5 mr-2" /> Add Category
        </Button>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-sm" />)}</div>
        ) : categories && categories.length > 0 ? (
          <div className="divide-y divide-border">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                <div className="h-9 w-9 rounded-sm bg-primary/8 flex items-center justify-center shrink-0 overflow-hidden border border-primary/15">
                  <Tag className="h-4 w-4 text-primary/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground text-sm">{cat.name}</p>
                  <p className="text-[10px] text-muted-foreground font-sans font-light mt-0.5">
                    {cat.slug}{cat.created_at ? <> · Added {formatDate(cat.created_at)}</> : ""}
                  </p>
                  {cat.description && <p className="text-xs text-muted-foreground font-light mt-1 line-clamp-1">{cat.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm" onClick={() => openEdit(cat)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm text-destructive hover:text-destructive" onClick={() => handleDelete(cat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">
            No categories yet. <button className="text-primary underline" onClick={openCreate}>Add one.</button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Catalog</p>
            <DialogTitle className="font-display text-xl">{editId ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Name *</Label>
              <Input value={form.name} onChange={e => { setF("name", e.target.value); if (!editId) setF("slug", toSlug(e.target.value)); }} className="mt-1 rounded-sm" required />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Slug *</Label>
              <Input value={form.slug} onChange={e => setF("slug", e.target.value)} className="mt-1 rounded-sm" required />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Description</Label>
              <Textarea value={form.description} onChange={e => setF("description", e.target.value)} className="mt-1 rounded-sm" rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-sm font-sans uppercase tracking-widest text-xs">Cancel</Button>
              <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending} className="rounded-sm font-sans uppercase tracking-widest text-xs">
                {editId ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
