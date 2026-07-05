import { useListCustomers } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKES, formatDate } from "@/lib/utils";
import { Users } from "lucide-react";

export default function AdminCustomers() {
  const { data: customers, isLoading } = useListCustomers();

  return (
    <AdminLayout>
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">CRM</p>
        <h1 className="font-display text-3xl font-semibold text-foreground">Customers</h1>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-sm" />)}</div>
        ) : customers && customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Customer</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Contact</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-display font-semibold text-sm shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-muted-foreground text-xs font-light">{c.email}</p>
                      <p className="text-muted-foreground text-xs font-light">{c.phone}</p>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground text-xs font-light">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="h-12 w-12 border border-border rounded-sm flex items-center justify-center mx-auto mb-4">
              <Users className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-light text-sm">No customers yet.</p>
            <p className="text-muted-foreground/60 font-light text-xs mt-1">They appear here once orders are placed.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
