import { useState } from "react";
import { useListQuotations, useGetQuotation, useUpdateQuotation } from "@/lib/admin-api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Search, FileText, Eye, CheckCircle, XCircle, Clock, Mail, Phone, MapPin, Calendar, User } from "lucide-react";
import { formatKES } from "@/lib/utils";

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  reviewing: "bg-sky-50 text-sky-700 border-sky-200",
  quoted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  reviewing: Eye,
  quoted: FileText,
  accepted: CheckCircle,
  declined: XCircle,
};

export default function AdminQuotations() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewId, setViewId] = useState<number | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: "", notes: "", quoted_amount: "" });
  const queryClient = useQueryClient();

  const { data: quotations, isLoading } = useListQuotations(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const { data: selectedQuotation } = useGetQuotation(viewId!);
  const updateQuotation = useUpdateQuotation();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["quotations"] });
    queryClient.invalidateQueries({ queryKey: ["quotation"] });
  };

  const openUpdate = (q: any) => {
    setViewId(q.id);
    setUpdateForm({
      status: q.status ?? "pending",
      notes: q.admin_notes ?? "",
      quoted_amount: q.quoted_amount ? String(q.quoted_amount) : "",
    });
    setUpdateOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewId) return;
    const data: any = {
      status: updateForm.status,
      admin_notes: updateForm.notes || null,
    };
    if (updateForm.quoted_amount) {
      data.quoted_amount = Number(updateForm.quoted_amount);
    }
    updateQuotation.mutate(
      { id: viewId, data },
      { onSuccess: () => { invalidate(); setUpdateOpen(false); } }
    );
  };

  const filteredQuotations = quotations?.filter((q: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      q.customer_name?.toLowerCase().includes(searchLower) ||
      q.customer_email?.toLowerCase().includes(searchLower) ||
      q.customer_phone?.includes(search)
    );
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">
            Business
          </p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Quotations</h1>
        </div>
      </div>

      <p className="text-sm text-muted-foreground font-light mb-6">
        Manage quotation requests from customers. Review, quote prices, and track status through to acceptance or decline.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-sm text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] rounded-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-sm" />
            ))}
          </div>
        ) : filteredQuotations && filteredQuotations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">ID</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Customer</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Project</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Amount</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Status</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Date</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQuotations.map((q: any) => {
                  const StatusIcon = statusIcons[q.status] || Clock;
                  return (
                    <tr key={q.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs text-muted-foreground">#{q.id}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">{q.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{q.customer_phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-foreground font-medium truncate max-w-[200px]">{q.project_type}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{q.project_description?.substring(0, 50)}...</p>
                      </td>
                      <td className="py-4 px-6">
                        {q.quoted_amount ? (
                          <span className="font-display font-semibold text-foreground">{formatKES(q.quoted_amount)}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not quoted</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-sans border ${statusColors[q.status] || ""}`}>
                          <StatusIcon className="h-3 w-3" />
                          {q.status?.charAt(0).toUpperCase() + q.status?.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs text-muted-foreground">{formatDate(q.created_at)}</span>
                      </td>
                      <td className="py-4 px-6">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-sm h-8 text-xs"
                          onClick={() => openUpdate(q)}
                        >
                          View / Update
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">
            No quotations found.
          </div>
        )}
      </div>

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm">
          <DialogHeader>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">
              Business
            </p>
            <DialogTitle className="font-display text-xl">
              Quotation #{selectedQuotation?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedQuotation && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="bg-muted/30 rounded-sm p-4 space-y-3">
                <h4 className="text-xs uppercase tracking-widest font-sans text-muted-foreground mb-2">Customer Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground font-medium">{selectedQuotation.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedQuotation.customer_phone}`} className="text-primary hover:underline">
                      {selectedQuotation.customer_phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selectedQuotation.customer_email}`} className="text-primary hover:underline">
                      {selectedQuotation.customer_email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{selectedQuotation.customer_location}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Submitted: {formatDate(selectedQuotation.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div className="bg-muted/30 rounded-sm p-4 space-y-3">
                <h4 className="text-xs uppercase tracking-widest font-sans text-muted-foreground mb-2">Project Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Project Type:</span>{" "}
                    <span className="font-medium text-foreground">{selectedQuotation.project_type}</span>
                  </div>
                  {selectedQuotation.project_size && (
                    <div>
                      <span className="text-muted-foreground">Size/Area:</span>{" "}
                      <span className="text-foreground">{selectedQuotation.project_size}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Description:</span>
                    <p className="text-foreground mt-1">{selectedQuotation.project_description}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              {selectedQuotation.items && selectedQuotation.items.length > 0 && (
                <div className="bg-muted/30 rounded-sm p-4 space-y-3">
                  <h4 className="text-xs uppercase tracking-widest font-sans text-muted-foreground mb-2">Requested Items</h4>
                  <div className="space-y-2">
                    {selectedQuotation.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {item.product_name} x {item.quantity}
                        </span>
                        <span className="text-muted-foreground">{item.unit || ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Update Form */}
              <form onSubmit={handleUpdate} className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Update Quotation</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-widest font-sans">Status</Label>
                    <Select
                      value={updateForm.status}
                      onValueChange={(v) => setUpdateForm((f) => ({ ...f, status: v }))}
                    >
                      <SelectTrigger className="mt-1 rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewing">Reviewing</SelectItem>
                        <SelectItem value="quoted">Quoted</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-widest font-sans">Quoted Amount (KES)</Label>
                    <Input
                      type="number"
                      value={updateForm.quoted_amount}
                      onChange={(e) => setUpdateForm((f) => ({ ...f, quoted_amount: e.target.value }))}
                      className="mt-1 rounded-sm"
                      placeholder="Enter quoted price"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Internal Notes</Label>
                  <Textarea
                    value={updateForm.notes}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, notes: e.target.value }))}
                    className="mt-1 rounded-sm"
                    rows={3}
                    placeholder="Notes about this quotation (visible only to admin)"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUpdateOpen(false)}
                    className="rounded-sm font-sans uppercase tracking-widest text-xs"
                  >
                    Close
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateQuotation.isPending}
                    className="rounded-sm font-sans uppercase tracking-widest text-xs"
                  >
                    Save Update
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
