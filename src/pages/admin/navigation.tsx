import { useState, useEffect } from "react";
import { AdminLayout } from './dashboard';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowUpDown } from "lucide-react";

interface NavItem {
  id: string;
  menu_name: string;
  location: string;
  label: string;
  href: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
}

const LOCATIONS = [
  { value: "main", label: "Main Navigation" },
  { value: "footer", label: "Footer" },
  { value: "mobile", label: "Mobile Menu" },
];

export default function AdminNavigation() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NavItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from("navigation_menus").select("*").order("display_order");
    setItems(data || []);
    setLoading(false);
  };

  const handleSave = async (form: Partial<NavItem>) => {
    if (editing) {
      const { error } = await supabase
        .from("navigation_menus")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("navigation_menus").insert([form]);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editing ? "Item updated" : "Item created" });
    setDialogOpen(false);
    setEditing(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("navigation_menus").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Item deleted" });
    fetchItems();
  };

  const toggleActive = async (item: NavItem) => {
    await supabase.from("navigation_menus").update({ is_active: !item.is_active }).eq("id", item.id);
    fetchItems();
  };

  return (
    <AdminLayout title="Navigation Manager">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground font-light">Manage navigation menu items for the main menu, footer, and mobile menu.</p>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button className="rounded-sm gap-2"><Plus className="h-4 w-4" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Navigation Item" : "Add Navigation Item"}</DialogTitle>
              </DialogHeader>
              <NavForm initial={editing} onSave={handleSave} onCancel={() => setDialogOpen(false)} items={items} />
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-sm" />)}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-sm">
            <p className="text-muted-foreground text-sm">No navigation items yet. Click "Add Item" to create one.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {LOCATIONS.map((loc) => {
              const locItems = items.filter((i) => i.location === loc.value);
              if (locItems.length === 0) return null;
              return (
                <div key={loc.value} className="mb-6">
                  <h3 className="text-xs uppercase tracking-widest font-sans font-semibold text-muted-foreground mb-2 px-1">{loc.label}</h3>
                  <div className="space-y-1">
                    {locItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 bg-background border border-border rounded-sm px-4 py-3">
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{item.label}</span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">{item.href}</span>
                            {item.open_in_new_tab && <span className="text-[9px] text-muted-foreground uppercase">new tab</span>}
                          </div>
                          <span className="text-xs text-muted-foreground">Order: {item.display_order}</span>
                        </div>
                        <button onClick={() => toggleActive(item)} className="p-1.5 text-muted-foreground hover:text-foreground" title={item.is_active ? "Deactivate" : "Activate"}>
                          {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => { setEditing(item); setDialogOpen(true); }}
                          className="p-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function NavForm({
  initial,
  onSave,
  onCancel,
  items,
}: {
  initial: NavItem | null;
  onSave: (f: Partial<NavItem>) => void;
  onCancel: () => void;
  items: NavItem[];
}) {
  const [form, setForm] = useState({
    menu_name: initial?.menu_name || "",
    location: initial?.location || "main",
    label: initial?.label || "",
    href: initial?.href || "/",
    parent_id: initial?.parent_id || null as string | null,
    display_order: initial?.display_order ?? items.length + 1,
    is_active: initial?.is_active ?? true,
    open_in_new_tab: initial?.open_in_new_tab ?? false,
  });

  return (
    <div className="space-y-4 py-4">
      <div>
        <Label className="text-xs font-sans">Label</Label>
        <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="mt-1 rounded-sm" placeholder="e.g. About Us" />
      </div>
      <div>
        <Label className="text-xs font-sans">Link URL</Label>
        <Input value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} className="mt-1 rounded-sm" placeholder="e.g. /about" />
      </div>
      <div>
        <Label className="text-xs font-sans">Location</Label>
        <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
          <SelectTrigger className="mt-1 rounded-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LOCATIONS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-sans">Display Order</Label>
          <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className="mt-1 rounded-sm" />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <span className="text-xs font-sans">Active</span>
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={form.open_in_new_tab} onCheckedChange={(v) => setForm({ ...form, open_in_new_tab: v })} />
          <span className="text-xs font-sans">Open in new tab</span>
        </label>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1 rounded-sm">Cancel</Button>
        <Button onClick={() => onSave(form)} className="flex-1 rounded-sm">Save</Button>
      </div>
    </div>
  );
}
