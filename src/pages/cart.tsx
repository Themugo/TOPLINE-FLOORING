import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreateOrder, useCreateCustomer } from "@/lib/api";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/use-cart";
import { formatKES } from "@/lib/utils";
import { Trash2, ShoppingCart, ArrowLeft, Minus, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Cart() {
  const { items, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();
  const [, setLocation] = useLocation();
  const createOrder = useCreateOrder();
  const createCustomer = useCreateCustomer();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // Create customer first
      const customer = await createCustomer.mutateAsync({
        name: form.name,
        email: form.email,
        phone: form.phone,
      });

      // Create order with items
      const orderData = {
        customer_id: customer.id,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: form.email,
        total_amount: totalPrice,
        notes: form.notes || null,
      };

      const orderItems = items.map(i => ({
        product_id: i.product.id,
        product_name: i.product.name,
        quantity: i.quantity,
        unit_price: i.product.price,
      }));

      const order = await createOrder.mutateAsync({
        order: orderData,
        items: orderItems,
      });

      clearCart();
      setLocation(`/order-confirmation/${order.id}`);
    } catch {
      toast({ title: "Order failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  if (items.length === 0) {
    return (
      <CustomerLayout>
        <div className="container mx-auto px-6 md:px-12 py-28 text-center">
          <div className="h-16 w-16 border border-border flex items-center justify-center mx-auto mb-6 rounded-sm">
            <ShoppingCart className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-3">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8 font-light">Add some services to get started.</p>
          <Link href="/shop"><Button className="rounded-sm font-sans uppercase tracking-widest text-xs px-8">Browse Services</Button></Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="container mx-auto px-6 md:px-12 py-14">
        <Link href="/shop" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-10 transition-colors font-sans uppercase tracking-widest">
          <ArrowLeft className="h-3.5 w-3.5" /> Continue Shopping
        </Link>
        <h1 className="font-display text-4xl font-semibold text-foreground mb-10">Your Cart</h1>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-3">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="bg-card border border-border rounded-sm p-5 flex items-center gap-4">
                <div className="h-14 w-14 bg-muted rounded-sm flex items-center justify-center shrink-0 overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingCart className="h-5 w-5 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-foreground truncate">{product.name}</h3>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">{formatKES(product.price)}{product.unit ? ` / ${product.unit}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-border rounded-sm">
                    <button
                      className="px-2.5 py-2 hover:bg-muted transition-colors"
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-3 py-2 text-sm font-display font-semibold min-w-[2.5rem] text-center">{quantity}</span>
                    <button
                      className="px-2.5 py-2 hover:bg-muted transition-colors"
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="min-w-[80px] text-right">
                    <p className="font-display font-semibold text-sm">{formatKES(product.price * quantity)}</p>
                  </div>
                  <button className="text-muted-foreground hover:text-destructive transition-colors p-1" onClick={() => removeFromCart(product.id)} aria-label="Remove item">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="bg-secondary text-secondary-foreground rounded-sm p-5 flex items-center justify-between">
              <span className="font-sans uppercase tracking-widest text-xs text-secondary-foreground/60">Order Total</span>
              <span className="font-display font-semibold text-2xl">{formatKES(totalPrice)}</span>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-sm p-7 sticky top-24">
              <h2 className="font-display text-2xl font-semibold text-foreground mb-7">Your Details</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Full Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1.5 rounded-sm font-sans h-10" placeholder="John Doe" />
                  {errors.name && <p className="text-xs text-destructive mt-1 font-sans">{errors.name}</p>}
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Email Address *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5 rounded-sm font-sans h-10" placeholder="john@example.com" />
                  {errors.email && <p className="text-xs text-destructive mt-1 font-sans">{errors.email}</p>}
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Phone Number *</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1.5 rounded-sm font-sans h-10" placeholder="0720 000 000" />
                  {errors.phone && <p className="text-xs text-destructive mt-1 font-sans">{errors.phone}</p>}
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Additional Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1.5 rounded-sm font-sans" placeholder="Any special requirements..." rows={3} />
                </div>

                <div className="h-px bg-border" />

                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Total</span>
                  <span className="font-display font-semibold text-xl">{formatKES(totalPrice)}</span>
                </div>

                <Button type="submit" className="w-full rounded-sm font-sans uppercase tracking-widest text-xs h-11" size="lg" disabled={createOrder.isPending || createCustomer.isPending}>
                  {createOrder.isPending || createCustomer.isPending ? "Placing Order..." : "Place Order"}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center font-sans leading-relaxed">
                  Our team will contact you to confirm and schedule your project.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
