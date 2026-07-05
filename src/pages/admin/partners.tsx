import { useState } from "react";
import { useListPartners, useCreatePartner, useUpdatePartner, useDeletePartner } from "@/lib/admin-api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Building2, Eye, EyeOff, ExternalLink } from "lucide-react";

type PartnerForm = {
  name: string;
  logo_url: string;
  website: string;
  sort_order: string;
  is_active: boolean;
};

const emptyForm: PartnerForm = {
  name: "",
  logo_url: "",
  website: "",
  sort_order: "0",
  is_active: true,
};

export default function AdminPartners() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<PartnerForm>(emptyForm);
  const queryClient = useQueryClient();

  const { data: partners, isLoading } = useListPartners();
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
  const deletePartner = useDeletePartner();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["partners"] });

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, sort_order: String(partners?.length ?? 0) });
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name ?? "",
      logo_url: p.logo_url ?? "",
      website: p.website ?? "",
      sort_order: String(p.sort_order ?? 0),
      is_active: p.is_active ?? true,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      logo_url: form.logo_url || null,
      website: form.website || null,
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    };
    if (editId) {
      updatePartner.mutate({ id: editId, data }, { onSuccess: () => { invalidate(); setOpen(false); } });
    } else {
      createPartner.mutate({ data }, { onSuccess: () => { invalidate(); setOpen(false); } });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this partner?")) return;
    deletePartner.mutate(id, { onSuccess: invalidate });
  };

  const toggleActive = (p: any) => {
    updatePartner.mutate(
      { id: p.id, data: { is_active: !p.is_active } },
      { onSuccess: invalidate }
    );
  };

  const setF = (k: keyof PartnerForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">
            Website Content
          </p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Partners</h1>
        </div>
        <Button onClick={openCreate} className="rounded-sm font-sans uppercase tracking-widest text-xs h-9">
          <Plus className="h-3.5 w-3.5 mr-2" /> Add Partner
        </Button>
      </div>

      <p className="text-sm text-muted-foreground font-light mb-6">
        Manage partner and brand logos displayed on the homepage. Active partners appear in the partner section.
      </p>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-sm" />
            ))}
          </div>
        ) : partners && partners.length > 0 ? (
          <div className="divide-y divide-border">
            {partners.map((p: any) => (
              <div
                key={p.id}
                className={`flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors ${
                  !p.is_active ? "opacity-50" : ""
                }`}
              >
                <div className="h-12 w-24 rounded-sm bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt={p.name}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-foreground">{p.name}</h3>
                  {p.website && (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {p.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <span className="text-xs text-muted-foreground font-light">Order: {p.sort_order}</span>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-sm"
                    onClick={() => toggleActive(p)}
                    title={p.is_active ? "Deactivate" : "Activate"}
                  >
                    {p.is_active ? (
                      <Eye className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-sm"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-sm text-destructive hover:text-destructive"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">
            No partners yet.{" "}
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
              {editId ? "Edit Partner" : "New Partner"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Partner Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setF("name", e.target.value)}
                className="mt-1 rounded-sm"
                placeholder="e.g., Mapei, Sika, Duraproof"
                required
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Logo URL</Label>
              <Input
                value={form.logo_url}
                onChange={(e) => setF("logo_url", e.target.value)}
                className="mt-1 rounded-sm"
                placeholder="https://..."
              />
              {form.logo_url && (
                <div className="mt-2 h-16 w-32 bg-muted rounded-sm flex items-center justify-center border border-border overflow-hidden">
                  <img
                    src={form.logo_url}
                    alt=""
                    className="w-full h-full object-contain p-2"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setF("website", e.target.value)}
                className="mt-1 rounded-sm"
                placeholder="https://example.com"
              />
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
                  id="p_is_active"
                />
                <Label htmlFor="p_is_active" className="text-sm">
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
                disabled={createPartner.isPending || updatePartner.isPending}
                className="rounded-sm font-sans uppercase tracking-widest text-xs"
              >
                {editId ? "Save Changes" : "Create Partner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
