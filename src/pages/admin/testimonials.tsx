import { useState } from "react";
import { useListTestimonials, useCreateTestimonial, useUpdateTestimonial, useDeleteTestimonial } from "@/lib/admin-api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Star, User, Eye, EyeOff } from "lucide-react";

type TestimonialForm = {
  customer_name: string;
  location: string;
  rating: string;
  text: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
};

const emptyForm: TestimonialForm = {
  customer_name: "",
  location: "",
  rating: "5",
  text: "",
  image_url: "",
  sort_order: "0",
  is_active: true,
};

export default function AdminTestimonials() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<TestimonialForm>(emptyForm);
  const queryClient = useQueryClient();

  const { data: testimonials, isLoading } = useListTestimonials();
  const createTestimonial = useCreateTestimonial();
  const updateTestimonial = useUpdateTestimonial();
  const deleteTestimonial = useDeleteTestimonial();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["testimonials"] });

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, sort_order: String(testimonials?.length ?? 0) });
    setOpen(true);
  };

  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({
      customer_name: t.customer_name ?? "",
      location: t.location ?? "",
      rating: String(t.rating ?? 5),
      text: t.text ?? "",
      image_url: t.image_url ?? "",
      sort_order: String(t.sort_order ?? 0),
      is_active: t.is_active ?? true,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      customer_name: form.customer_name,
      location: form.location || null,
      rating: Number(form.rating),
      text: form.text,
      image_url: form.image_url || null,
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    };
    if (editId) {
      updateTestimonial.mutate({ id: editId, data }, { onSuccess: () => { invalidate(); setOpen(false); } });
    } else {
      createTestimonial.mutate({ data }, { onSuccess: () => { invalidate(); setOpen(false); } });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this testimonial?")) return;
    deleteTestimonial.mutate(id, { onSuccess: invalidate });
  };

  const toggleActive = (t: any) => {
    updateTestimonial.mutate(
      { id: t.id, data: { is_active: !t.is_active } },
      { onSuccess: invalidate }
    );
  };

  const setF = (k: keyof TestimonialForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">
            Website Content
          </p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Testimonials</h1>
        </div>
        <Button onClick={openCreate} className="rounded-sm font-sans uppercase tracking-widest text-xs h-9">
          <Plus className="h-3.5 w-3.5 mr-2" /> Add Testimonial
        </Button>
      </div>

      <p className="text-sm text-muted-foreground font-light mb-6">
        Manage customer testimonials displayed on the homepage. Featured testimonials build trust with potential clients.
      </p>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-sm" />
            ))}
          </div>
        ) : testimonials && testimonials.length > 0 ? (
          <div className="divide-y divide-border">
            {testimonials.map((t: any) => (
              <div
                key={t.id}
                className={`flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors ${
                  !t.is_active ? "opacity-50" : ""
                }`}
              >
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                  {t.image_url ? (
                    <img src={t.image_url} alt={t.customer_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-semibold text-foreground">{t.customer_name}</h3>
                    {t.location && (
                      <span className="text-xs text-muted-foreground font-light">{t.location}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < (t.rating ?? 5)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/20"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 font-light">{t.text}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-sm"
                    onClick={() => toggleActive(t)}
                    title={t.is_active ? "Deactivate" : "Activate"}
                  >
                    {t.is_active ? (
                      <Eye className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-sm"
                    onClick={() => openEdit(t)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-sm text-destructive hover:text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">
            No testimonials yet.{" "}
            <button className="text-primary underline" onClick={openCreate}>
              Add one.
            </button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-sm">
          <DialogHeader>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">
              Website Content
            </p>
            <DialogTitle className="font-display text-xl">
              {editId ? "Edit Testimonial" : "New Testimonial"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Customer Name *</Label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => setF("customer_name", e.target.value)}
                  className="mt-1 rounded-sm"
                  required
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setF("location", e.target.value)}
                  className="mt-1 rounded-sm"
                  placeholder="e.g., Nairobi, Kenya"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Rating *</Label>
              <div className="flex items-center gap-2 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setF("rating", String(i + 1))}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        i < Number(form.rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30 hover:text-muted-foreground/50"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">{form.rating}/5</span>
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Testimonial Text *</Label>
              <Textarea
                value={form.text}
                onChange={(e) => setF("text", e.target.value)}
                className="mt-1 rounded-sm"
                rows={4}
                required
                placeholder="What did the customer say about your service?"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Customer Photo URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setF("image_url", e.target.value)}
                className="mt-1 rounded-sm"
                placeholder="https://..."
              />
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="mt-2 h-16 w-16 rounded-full object-cover border border-border"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setF("sort_order", e.target.value)}
                  className="mt-1 rounded-sm"
                  min={0}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setF("is_active", v)}
                  id="t_is_active"
                />
                <Label htmlFor="t_is_active" className="text-sm">
                  Active
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-sm font-sans uppercase tracking-widest text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTestimonial.isPending || updateTestimonial.isPending}
                className="rounded-sm font-sans uppercase tracking-widest text-xs"
              >
                {editId ? "Save Changes" : "Create Testimonial"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
