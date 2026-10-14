import { useEffect, useState } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, Phone, Mail, MessageCircle, CheckCircle2, Clock, Truck, XCircle, ShieldCheck, ArrowRight, CalendarDays, MapPin, RotateCcw, ClipboardCheck } from "lucide-react";
import { Link } from "wouter";
import { useSiteSettings } from "@/hooks/use-data";
import { useSeoMeta } from "@/hooks/use-seo";
import { trackOrder } from "@/lib/delivery";
import { telHref } from "@/lib/utils";

interface OrderResult {
  id: string;
  order_number: string | null;
  status: string;
  payment_status: string;
  total_amount: number;
  delivery_address: string | null;
  created_at: string;
  items?: { product_name: string; quantity: number; unit_price: number }[];
  delivery?: {
    tracking_number: string;
    status: string;
    scheduled_date: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
    driver_name: string | null;
    delivery_address: string | null;
    proof_of_delivery_note: string | null;
  } | null;
}

const orderStatusLabel: Record<string, string> = {
  pending: "Order received", confirmed: "Order confirmed", processing: "Being prepared",
  dispatched: "Dispatched", shipped: "Shipped", in_transit: "On the way",
  delivered: "Delivered", completed: "Completed", cancelled: "Cancelled", failed: "Needs attention",
};
const deliveryStatusLabel: Record<string, string> = {
  pending: "Awaiting dispatch", scheduled: "Delivery scheduled", dispatched: "Dispatched",
  in_transit: "On the way", delivered: "Delivered", completed: "Delivered", failed: "Delivery needs attention", cancelled: "Cancelled",
};
const orderStages = ["pending", "confirmed", "processing", "dispatched", "in_transit", "delivered"];
const iconForStatus = (status: string) => {
  if (["delivered", "completed"].includes(status)) return <CheckCircle2 className="h-5 w-5" />;
  if (["cancelled", "failed"].includes(status)) return <XCircle className="h-5 w-5" />;
  if (["dispatched", "shipped", "in_transit"].includes(status)) return <Truck className="h-5 w-5" />;
  if (["processing", "confirmed"].includes(status)) return <Package className="h-5 w-5" />;
  return <Clock className="h-5 w-5" />;
};
const displayDate = (value: string | null | undefined) => value
  ? new Date(value).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
  : null;
const money = (value: number) => `KES ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;

export default function TrackOrder() {
  useSeoMeta("track-order", null, { breadcrumbs: [{ label: "Track Order" }], noIndex: true });
  const { settings } = useSiteSettings();
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const order = params.get("order");
    if (order) setOrderId(order.slice(0, 120));
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setResult(null);
    const normalizedOrder = orderId.trim();
    const checkoutPhone = phone.trim();
    if (!normalizedOrder || !checkoutPhone) {
      setError("Enter both your order number and the phone number used at checkout.");
      return;
    }
    setLoading(true);
    try {
      const tracked = await trackOrder(normalizedOrder, checkoutPhone);
      if (!tracked?.found) {
        setError("We couldn't find an order matching those details. Check the order number and use the same phone number entered at checkout.");
        return;
      }
      if (!tracked.order) {
        setError("Order details could not be retrieved. Please try again or contact our team.");
        return;
      }
      setResult({ ...tracked.order, items: tracked.items || [], delivery: tracked.delivery || null });
    } catch {
      setError("We couldn't retrieve your order right now. Please try again shortly or contact our team.");
    } finally {
      setLoading(false);
    }
  };

  const status = (result?.status || "pending").toLowerCase();
  const currentStage = status === "shipped" ? "dispatched" : status;
  const stageIndex = orderStages.indexOf(currentStage);
  const cancelled = ["cancelled", "failed"].includes(status);

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "Track Order" }]} />
      <div className="bg-[#F7F5EF]">
        <section className="relative overflow-hidden bg-[#142C46] text-white">
          <div aria-hidden="true" className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#A8B9CA] via-[#142C46] to-[#0B1B2D]" />
          <div className="page-container relative grid gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_280px] lg:items-end lg:py-20">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E4D8BF]"><ClipboardCheck className="h-4 w-4" /> Order care</p>
              <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">Your order, clearly accounted for.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">Check the latest order and delivery information using the order number and phone number supplied at checkout.</p>
            </div>
            <div className="hidden rounded-2xl border border-white/15 bg-white/[0.06] p-5 lg:block">
              <ShieldCheck className="h-6 w-6 text-[#D9C7A0]" />
              <p className="mt-3 text-sm font-semibold">Private order lookup</p>
              <p className="mt-1 text-xs leading-5 text-white/65">Both details are required before order information is returned.</p>
            </div>
          </div>
        </section>

        <section className="page-container py-8 sm:py-12 lg:py-16">
          {!result ? (
            <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
              <div className="py-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8C7448]">Order lookup</p>
                <h2 className="mt-3 font-display text-2xl font-semibold text-[#142C46] sm:text-3xl">Find your delivery</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">Use the order reference from your confirmation and the same phone number used when placing the order. We only show a limited summary needed to help you follow progress.</p>
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#E1E5EA] bg-white/70 p-4 text-sm text-slate-600">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#58728D]" />
                  <p><span className="font-semibold text-[#142C46]">Your details stay protected.</span> Order number alone is not enough to view an order.</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                  <Link href="/contact" className="inline-flex items-center gap-2 font-semibold text-[#142C46] hover:text-[#58728D]">Contact support <ArrowRight className="h-4 w-4" /></Link>
                  <Link href="/quotation" className="inline-flex items-center gap-2 font-semibold text-[#142C46] hover:text-[#58728D]">Request a quote <ArrowRight className="h-4 w-4" /></Link>
                </div>
              </div>
              <form onSubmit={handleTrack} className="rounded-2xl border border-[#E1E5EA] bg-white p-5 shadow-[0_18px_55px_-40px_rgba(20,44,70,0.4)] sm:p-8" aria-describedby={error ? "track-order-error" : "track-order-help"}>
                <div className="mb-6 border-b border-[#E9E7E0] pb-5">
                  <h2 className="font-display text-xl font-semibold text-[#142C46]">Order details</h2>
                  <p id="track-order-help" className="mt-1 text-sm text-slate-500">Both fields are required.</p>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="orderId" className="text-sm font-semibold text-[#142C46]">Order number</Label>
                    <Input id="orderId" name="orderNumber" autoComplete="off" required maxLength={120} value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Enter your order reference" className="h-12 rounded-lg border-[#D8DEE5] bg-white px-4 text-sm focus-visible:ring-[#58728D]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkoutPhone" className="text-sm font-semibold text-[#142C46]">Checkout phone number</Label>
                    <Input id="checkoutPhone" name="phone" type="tel" autoComplete="tel" required maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Use the number entered at checkout" className="h-12 rounded-lg border-[#D8DEE5] bg-white px-4 text-sm focus-visible:ring-[#58728D]" />
                    <p className="text-xs leading-5 text-slate-500">Enter the number in the same format used when you placed the order.</p>
                  </div>
                  {error && <p id="track-order-error" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">{error}</p>}
                  <Button type="submit" disabled={loading} className="h-12 w-full rounded-lg bg-[#142C46] text-sm font-semibold text-white hover:bg-[#203E5D] disabled:opacity-60">
                    {loading ? <><span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Looking up order…</> : <><Search className="mr-2 h-4 w-4" /> Track order</>}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="mx-auto max-w-5xl">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8C7448]">Order overview</p><h2 className="mt-2 font-display text-2xl font-semibold text-[#142C46] sm:text-3xl">Order {result.order_number || result.id.slice(0, 8)}</h2></div>
                <Button variant="outline" onClick={() => { setResult(null); setError(null); }} className="rounded-lg border-[#C9D1DA] bg-white text-[#142C46]"><RotateCcw className="mr-2 h-4 w-4" />Track another order</Button>
              </div>
              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-5">
                  <section className="rounded-2xl border border-[#E1E5EA] bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cancelled ? "bg-red-50 text-red-700" : status === "delivered" || status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-[#EEF2F6] text-[#142C46]"}`}>{iconForStatus(status)}</div>
                      <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current order status</p><p className="mt-1 font-display text-xl font-semibold text-[#142C46]">{orderStatusLabel[status] || status.replace(/_/g, " ")}</p><p className="mt-2 text-sm text-slate-500">Placed {displayDate(result.created_at) || "date unavailable"}</p></div>
                    </div>
                    {!cancelled && <div className="mt-7 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Order progress">
                      {orderStages.map((stage, index) => {
                        const complete = stageIndex >= index || status === "completed";
                        return <div key={stage} className="min-w-0"><div className={`h-1.5 rounded-full ${complete ? "bg-[#58728D]" : "bg-[#E5E9ED]"}`} /><p className={`mt-2 text-[10px] leading-4 sm:text-[11px] ${complete ? "font-semibold text-[#142C46]" : "text-slate-400"}`}>{({ pending: "Received", confirmed: "Confirmed", processing: "Preparing", dispatched: "Dispatched", in_transit: "In transit", delivered: "Delivered" } as Record<string, string>)[stage]}</p></div>;
                      })}
                    </div>}
                    {cancelled && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-800">This order needs assistance. Please contact our team for clarification.</p>}
                    <div className="mt-6 grid gap-4 border-t border-[#E9E7E0] pt-5 sm:grid-cols-2">
                      <div><p className="text-xs text-slate-500">Payment status</p><p className="mt-1 font-semibold capitalize text-[#142C46]">{(result.payment_status || "unknown").replace(/_/g, " ")}</p></div>
                      <div><p className="text-xs text-slate-500">Order total</p><p className="mt-1 font-display text-xl font-semibold text-[#142C46]">{money(result.total_amount)}</p></div>
                    </div>
                    {result.delivery_address && <div className="mt-4 flex items-start gap-3 border-t border-[#E9E7E0] pt-4"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><p className="text-xs text-slate-500">Delivery address</p><p className="mt-1 break-words text-sm font-medium text-[#142C46]">{result.delivery_address}</p></div></div>}
                  </section>
                  {result.items && result.items.length > 0 && <section className="rounded-2xl border border-[#E1E5EA] bg-white p-5 sm:p-7"><h3 className="font-display text-lg font-semibold text-[#142C46]">Items in this order</h3><div className="mt-4 divide-y divide-[#EEF0F2]">{result.items.map((item, index) => <div key={`${item.product_name}-${index}`} className="flex items-start justify-between gap-4 py-3 text-sm"><div className="min-w-0"><p className="font-medium text-[#142C46]">{item.product_name}</p><p className="mt-1 text-xs text-slate-500">Quantity: {item.quantity}</p></div><p className="shrink-0 font-semibold text-[#142C46]">{money(Number(item.unit_price) * Number(item.quantity))}</p></div>)}</div></section>}
                </div>
                <aside className="space-y-5">
                  <section className="rounded-2xl border border-[#E1E5EA] bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2F6] text-[#142C46]"><Truck className="h-5 w-5" /></div><div><h3 className="font-display text-lg font-semibold text-[#142C46]">Delivery details</h3><p className="text-xs text-slate-500">Latest details available to us</p></div></div>
                    {result.delivery ? <div className="mt-5 space-y-4 text-sm">
                      <div><p className="text-xs text-slate-500">Delivery reference</p><p className="mt-1 break-all font-mono font-semibold text-[#142C46]">{result.delivery.tracking_number || "Not assigned yet"}</p></div>
                      <div><p className="text-xs text-slate-500">Delivery status</p><p className="mt-1 font-semibold text-[#142C46]">{deliveryStatusLabel[result.delivery.status] || result.delivery.status.replace(/_/g, " ")}</p></div>
                      <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><p className="text-xs text-slate-500">Scheduled date</p><p className="mt-1 font-medium text-[#142C46]">{displayDate(result.delivery.scheduled_date) || "Not scheduled yet"}</p></div></div>
                      {result.delivery.dispatched_at && <div><p className="text-xs text-slate-500">Dispatched on</p><p className="mt-1 font-medium text-[#142C46]">{displayDate(result.delivery.dispatched_at)}</p></div>}
                      {result.delivery.delivered_at && <div><p className="text-xs text-slate-500">Delivered on</p><p className="mt-1 font-medium text-[#142C46]">{displayDate(result.delivery.delivered_at)}</p></div>}
                      {result.delivery.driver_name && <div><p className="text-xs text-slate-500">Delivery contact</p><p className="mt-1 font-medium text-[#142C46]">{result.delivery.driver_name}</p></div>}
                      {result.delivery.proof_of_delivery_note && <div className="rounded-lg bg-[#F7F5EF] p-3"><p className="text-xs font-semibold text-[#142C46]">Delivery note</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{result.delivery.proof_of_delivery_note}</p></div>}
                    </div> : <p className="mt-4 rounded-lg bg-[#F7F5EF] p-4 text-sm leading-6 text-slate-600">A delivery reference has not been added to this order yet. Check again later or contact our team if you need an update.</p>}
                  </section>
                  <section className="rounded-2xl bg-[#142C46] p-5 text-white sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D9C7A0]">Need assistance?</p><h3 className="mt-2 font-display text-xl font-semibold">We can help with your order.</h3><p className="mt-2 text-sm leading-6 text-white/70">Contact our team if a detail needs clarification.</p><div className="mt-5 space-y-3">{settings.contact?.phone && <a href={telHref(settings.contact.phone)} className="flex items-center gap-3 rounded-lg border border-white/15 px-3 py-3 text-sm font-medium hover:bg-white/5"><Phone className="h-4 w-4 text-[#D9C7A0]" />{settings.contact.phone}</a>}{settings.contact?.email && <a href={`mailto:${settings.contact.email}?subject=${encodeURIComponent(`Order ${result.order_number || result.id.slice(0, 8)} enquiry`)}`} className="flex items-center gap-3 rounded-lg border border-white/15 px-3 py-3 text-sm font-medium hover:bg-white/5"><Mail className="h-4 w-4 text-[#D9C7A0]" />Email support</a>}{settings.social_links?.whatsapp && <a href={settings.social_links.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-white/15 px-3 py-3 text-sm font-medium hover:bg-white/5"><MessageCircle className="h-4 w-4 text-[#D9C7A0]" />WhatsApp</a>}<Link href="/contact" className="flex items-center justify-between rounded-lg bg-white px-3 py-3 text-sm font-semibold text-[#142C46] hover:bg-[#F7F5EF]">Open contact form <ArrowRight className="h-4 w-4" /></Link></div></section>
                </aside>
              </div>
            </div>
          )}
        </section>
      </div>
    </CustomerLayout>
  );
}
