import { useState } from "react";
import { useListPartners, useCreatePartner, useUpdatePartner, useDeletePartner } from "@/lib/admin-api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Building2, Eye, EyeOff, ExternalLink, Star, Mail, Phone } from "lucide-react";

type PartnerForm = {
  name: string;
  logo_url: string;
  website_url: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  featured: boolean;
  sort_order: string;
  is_active: boolean;
};

const emptyForm: PartnerForm = {
  name: "",
  logo_url: "",
  website_url: "",
  description: "",
  contact_email: "",
  contact_phone: "",
  featured: false,
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
      website_url: p.website_url ?? p.website ?? "",
      description: p.description ?? "",
      contact_email: p.contact_email ?? "",
      contact_phone: p.contact_phone ?? "",
      featured: p.featured ?? false,
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
      website_url: form.website_url || null,
      description: form.description || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      featured: form.featured,
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
    updatePartner.mutate({ id: p.id, data: { is_active: !p.is_active } }, { onSuccess: invalidate });
  };

  const toggleFeatured = (p: any) => {
    updatePartner.mutate({ id: p.id, data: { featured: !p.featured } }, { onSuccess: invalidate });
  };

  const setF = (k: keyof PartnerForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Website Content</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Partners & Suppliers</h1>
        </div>
        <Button onClick={openCreate} className="rounded-sm font-sans uppercase tracking-widest text-xs h-9">
          <Plus className="h-3.5 w-3.5 mr-2" /> Add Partner
        </Button>
      </div>

      <p className="text-sm text-muted-foreground font-light mb-6">
        Manage partner logos, descriptions, and contact information. Active partners appear on the homepage.
      </p>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-sm" />
            ))}
          </div>
        ) : partners && partners.length > 0 ? (
          <div className="divide-y divide-border">
            {partners.map((p: any) => (
              <div key={p.id} className={`flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors ${!p.is_active ? "opacity-50" : ""}`}>
                <div className="h-14 w-28 rounded-sm bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <Building2 className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-foreground">{p.name}</h3>
                    {p.featured && <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />}
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    {p.website_url && (
                      <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Website
                      </a>
                    )}
                    {p.contact_email && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {p.contact_email}
                      </span>
                    )}
                    {p.contact_phone && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {p.contact_phone}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-xs text-muted-foreground font-light">Order: {p.sort_order}</span>

                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-sm" onClick={() => toggleFeatured(p)} title={p.featured ? "Unfeature" : "Feature"}>
                    <Star className={`h-4 w-4 ${p.featured ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-sm" onClick={() => toggleActive(p)} title={p.is_active ? "Deactivate" : "Activate"}>
                    {p.is_active ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-sm" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-sm text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">
            No partners yet.{" "}
            <button className="text-primary underline" onClick={openCreate}>Add one.</button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-sm">
          <DialogHeader>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Website Content</p>
            <DialogTitle className="font-display text-xl">{editId ? "Edit Partner" : "New Partner"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Partner Name *</Label>
              <Input value={form.name} onChange={(e) => setF("name", e.target.value)} className="mt-1 rounded-sm" placeholder="e.g., Mapei, Sika, Duraproof" required />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Logo URL</Label>
              <Input value={form.logo_url} onChange={(e) => setF("logo_url", e.target.value)} className="mt-1 rounded-sm" placeholder="https://..." />
              {form.logo_url && (
                <div className="mt-2 h-16 w-32 bg-muted rounded-sm flex items-center justify-center border border-border overflow-hidden">
                  <img src={form.logo_url} alt="" className="w-full h-full object-contain p-2" onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans">Description</Label>
              <Textarea value={form.description} onChange={(e) => setF("description", e.target.value)} className="mt-1 rounded-sm min-h-[60px]" placeholder="Brief description of the partner company..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Website URL</Label>
                <Input value={form.website_url} onChange={(e) => setF("website_url", e.target.value)} className="mt-1 rounded-sm" placeholder="https://example.com" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Contact Email</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => setF("contact_email", e.target.value)} className="mt-1 rounded-sm" placeholder="info@partner.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Contact Phone</Label>
                <Input type="tel" value={form.contact_phone} onChange={(e) => setF("contact_phone", e.target.value)} className="mt-1 rounded-sm" placeholder="+254 700 000 000" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setF("sort_order", e.target.value)} className="mt-1 rounded-sm" min={0} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={(v) => setF("is_active", v)} id="p_is_active" />
                <Label htmlFor="p_is_active" className="text-sm">Active</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.featured} onCheckedChange={(v) => setF("featured", v)} id="p_featured" />
                <Label htmlFor="p_featured" className="text-sm">Featured</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-sm font-sans uppercase tracking-widest text-xs">Cancel</Button>
              <Button type="submit" disabled={createPartner.isPending || updatePartner.isPending} className="rounded-sm font-sans uppercase tracking-widest text-xs">
                {editId ? "Save Changes" : "Create Partner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
