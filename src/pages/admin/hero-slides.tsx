import { useState } from "react";
import { useListHeroSlides, useCreateHeroSlide, useUpdateHeroSlide, useDeleteHeroSlide } from "@/lib/admin-api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, GripVertical, Image, Eye, EyeOff } from "lucide-react";

type HeroSlideForm = {
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
};

const emptyForm: HeroSlideForm = {
  title: "",
  subtitle: "",
  button_text: "",
  button_link: "",
  image_url: "",
  sort_order: "0",
  is_active: true,
};

export default function AdminHeroSlides() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<HeroSlideForm>(emptyForm);
  const queryClient = useQueryClient();

  const { data: slides, isLoading } = useListHeroSlides();
  const createSlide = useCreateHeroSlide();
  const updateSlide = useUpdateHeroSlide();
  const deleteSlide = useDeleteHeroSlide();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["heroSlides"] });

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, sort_order: String(slides?.length ?? 0) });
    setOpen(true);
  };

  const openEdit = (slide: any) => {
    setEditId(slide.id);
    setForm({
      title: slide.title ?? "",
      subtitle: slide.subtitle ?? "",
      button_text: slide.button_text ?? "",
      button_link: slide.button_link ?? "",
      image_url: slide.image_url ?? "",
      sort_order: String(slide.sort_order ?? 0),
      is_active: slide.is_active ?? true,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title: form.title || null,
      subtitle: form.subtitle || null,
      button_text: form.button_text || null,
      button_link: form.button_link || null,
      image_url: form.image_url || null,
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    };
    if (editId) {
      updateSlide.mutate({ id: editId, data }, { onSuccess: () => { invalidate(); setOpen(false); } });
    } else {
      createSlide.mutate({ data }, { onSuccess: () => { invalidate(); setOpen(false); } });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this hero slide?")) return;
    deleteSlide.mutate(id, { onSuccess: invalidate });
  };

  const toggleActive = (slide: any) => {
    updateSlide.mutate(
      { id: slide.id, data: { is_active: !slide.is_active } },
      { onSuccess: invalidate }
    );
  };

  const setF = (k: keyof HeroSlideForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">
            Website Content
          </p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Hero Slides</h1>
        </div>
        <Button onClick={openCreate} className="rounded-sm font-sans uppercase tracking-widest text-xs h-9">
          <Plus className="h-3.5 w-3.5 mr-2" /> Add Slide
        </Button>
      </div>

      <p className="text-sm text-muted-foreground font-light mb-6">
        Manage the slides shown on the homepage hero section. Active slides appear in the rotation based on sort order.
      </p>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-sm" />
            ))}
          </div>
        ) : slides && slides.length > 0 ? (
          <div className="divide-y divide-border">
            {slides.map((slide: any) => (
              <div
                key={slide.id}
                className={`flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors ${
                  !slide.is_active ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="h-4 w-4 cursor-grab" />
                  <span className="text-xs font-sans w-6">{slide.sort_order}</span>
                </div>

                <div className="h-16 w-24 rounded-sm bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                  {slide.image_url ? (
                    <img
                      src={slide.image_url}
                      alt={slide.title ?? "Slide"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image className="h-6 w-6 text-muted-foreground/30" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-foreground truncate">
                    {slide.title || "Untitled Slide"}
                  </h3>
                  {slide.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{slide.subtitle}</p>
                  )}
                  {slide.button_text && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-sans bg-primary/10 text-primary rounded-sm">
                      {slide.button_text}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-sm"
                    onClick={() => toggleActive(slide)}
                    title={slide.is_active ? "Deactivate" : "Activate"}
                  >
                    {slide.is_active ? (
                      <Eye className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-sm"
                    onClick={() => openEdit(slide)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-sm text-destructive hover:text-destructive"
                    onClick={() => handleDelete(slide.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">
            No hero slides yet.{" "}
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
              {editId ? "Edit Hero Slide" : "New Hero Slide"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setF("title", e.target.value)}
                className="mt-1 rounded-sm"
                placeholder="e.g., Premium Flooring Solutions"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Subtitle</Label>
              <Input
                value={form.subtitle}
                onChange={(e) => setF("subtitle", e.target.value)}
                className="mt-1 rounded-sm"
                placeholder="Brief description shown below the title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Button Text</Label>
                <Input
                  value={form.button_text}
                  onChange={(e) => setF("button_text", e.target.value)}
                  className="mt-1 rounded-sm"
                  placeholder="e.g., Get a Quote"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Button Link</Label>
                <Input
                  value={form.button_link}
                  onChange={(e) => setF("button_link", e.target.value)}
                  className="mt-1 rounded-sm"
                  placeholder="e.g., /quotation"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Image URL *</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setF("image_url", e.target.value)}
                className="mt-1 rounded-sm"
                placeholder="https://..."
                required
              />
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="mt-2 h-24 w-auto rounded-sm border border-border"
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
                  id="is_active"
                />
                <Label htmlFor="is_active" className="text-sm">
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
                disabled={createSlide.isPending || updateSlide.isPending}
                className="rounded-sm font-sans uppercase tracking-widest text-xs"
              >
                {editId ? "Save Changes" : "Create Slide"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
