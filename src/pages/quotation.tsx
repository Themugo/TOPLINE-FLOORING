import { useState } from "react";
import { Link } from "wouter";
import { useListProducts, useListCategories } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatKES } from "@/lib/utils";
import { ArrowLeft, FileText, Plus, Trash2, Send, Loader2, CheckCircle } from "lucide-react";

interface SelectedItem {
  productId: number | null;
  productName: string;
  quantity: number;
}

export default function Quotation() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    companyName: "",
    projectType: "",
    projectLocation: "",
    projectDescription: "",
    estimatedBudget: "",
    preferredDate: "",
  });
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([{ productId: null, productName: "", quantity: 1 }]);
  const [agreeToContact, setAgreeToContact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: products, isLoading: productsLoading } = useListProducts();
  const { data: categories } = useListCategories();

  const addItem = () => {
    setSelectedItems([...selectedItems, { productId: null, productName: "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    if (selectedItems.length > 1) {
      setSelectedItems(selectedItems.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof SelectedItem, value: any) => {
    setSelectedItems(items => items.map((item, i) => {
      if (i === index) {
        if (field === 'productId') {
          const product = products?.find(p => p.id === value);
          return { ...item, productId: value, productName: product?.name || "" };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeToContact) {
      toast({ title: "Required", description: "Please agree to be contacted.", variant: "destructive" });
      return;
    }

    if (!form.customerName || !form.customerPhone) {
      toast({ title: "Required Fields", description: "Please fill in your name and phone number.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Insert quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          customer_name: form.customerName,
          customer_email: form.customerEmail || null,
          customer_phone: form.customerPhone,
          company_name: form.companyName || null,
          project_location: form.projectLocation || null,
          project_type: form.projectType || null,
          project_description: form.projectDescription || null,
          estimated_budget: form.estimatedBudget || null,
          preferred_date: form.preferredDate || null,
          status: 'pending',
        })
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Insert quotation items if any products selected
      const itemsToInsert = selectedItems
        .filter(item => item.productId !== null)
        .map(item => ({
          quotation_id: quotation.id,
          product_id: item.productId,
          item_name: item.productName,
          quantity: item.quantity,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      setSubmitted(true);
      toast({
        title: "Quotation Request Submitted",
        description: "Our team will contact you within 24 hours to discuss your project.",
      });
    } catch (error) {
      console.error('Quotation submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const projectTypes = [
    "Waterproofing - Roof",
    "Waterproofing - Basement",
    "Waterproofing - Water Tank",
    "Waterproofing - Swimming Pool",
    "Epoxy Flooring - Industrial",
    "Epoxy Flooring - Commercial",
    "Epoxy Flooring - Residential",
    "Concrete Repair",
    "Roof Coating",
    "Other",
  ];

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "Request a Quote" }]} />
      {/* Hero Section */}
      <div className="bg-secondary text-secondary-foreground py-16 md:py-20 relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-6 bg-primary" />
            <span className="text-primary text-xs uppercase tracking-[0.2em] font-sans font-medium">Get a Quote</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-semibold text-white mb-3">Request a Quotation</h1>
          <p className="text-secondary-foreground/50 max-w-xl font-light">Tell us about your project and we'll prepare a detailed quotation for you.</p>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-16">
        <Link href="/shop" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-10 transition-colors font-sans uppercase tracking-widest">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Shop
        </Link>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Customer Information */}
          <div className="bg-card border border-border rounded-sm p-8">
            <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Contact Information
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Full Name *</Label>
                <Input
                  value={form.customerName}
                  onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                  className="mt-1.5 rounded-sm h-10"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Phone Number *</Label>
                <Input
                  value={form.customerPhone}
                  onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                  className="mt-1.5 rounded-sm h-10"
                  placeholder="0720 000 000"
                  required
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Email Address</Label>
                <Input
                  type="email"
                  value={form.customerEmail}
                  onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                  className="mt-1.5 rounded-sm h-10"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Company Name</Label>
                <Input
                  value={form.companyName}
                  onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                  className="mt-1.5 rounded-sm h-10"
                  placeholder="Company Ltd"
                />
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-card border border-border rounded-sm p-8">
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">Project Details</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Project Type *</Label>
                <Select value={form.projectType} onValueChange={v => setForm(f => ({ ...f, projectType: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-sm h-10">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Project Location</Label>
                <Input
                  value={form.projectLocation}
                  onChange={e => setForm(f => ({ ...f, projectLocation: e.target.value }))}
                  className="mt-1.5 rounded-sm h-10"
                  placeholder="Nairobi, Kenya"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Estimated Budget (Optional)</Label>
                <Input
                  value={form.estimatedBudget}
                  onChange={e => setForm(f => ({ ...f, estimatedBudget: e.target.value }))}
                  className="mt-1.5 rounded-sm h-10"
                  placeholder="KES 100,000 - 200,000"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Preferred Start Date</Label>
                <Input
                  type="date"
                  value={form.preferredDate}
                  onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))}
                  className="mt-1.5 rounded-sm h-10"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Project Description</Label>
                <Textarea
                  value={form.projectDescription}
                  onChange={e => setForm(f => ({ ...f, projectDescription: e.target.value }))}
                  className="mt-1.5 rounded-sm"
                  rows={4}
                  placeholder="Describe your project in detail: area size, current condition, desired outcome, timeline, etc."
                />
              </div>
            </div>
          </div>

          {/* Product/Service Selection */}
          <div className="bg-card border border-border rounded-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold text-foreground">Products & Services</h2>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="rounded-sm text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
              </Button>
            </div>

            {productsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-sm" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-muted/50 rounded-sm">
                    <div className="flex-1">
                      <Select
                        value={item.productId ? String(item.productId) : ""}
                        onValueChange={v => updateItem(index, 'productId', v ? Number(v) : null)}
                      >
                        <SelectTrigger className="rounded-sm h-10">
                          <SelectValue placeholder="Select a product or service" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map(cat => (
                            <div key={cat.id}>
                              <p className="px-2 py-1.5 text-xs uppercase tracking-widest text-muted-foreground font-sans">{cat.name}</p>
                              {products?.filter(p => p.category_id === cat.id).map(p => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.name} - {formatKES(p.price)}{p.unit ? `/${p.unit}` : ""}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                        className="rounded-sm h-10"
                        placeholder="Qty"
                        min={1}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={selectedItems.length === 1}
                      className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              Select the products or services you're interested in. Our team will prepare a customized quotation based on your project requirements.
            </p>
          </div>

          {/* Agreement */}
          <div className="bg-muted/50 rounded-sm p-6 border border-border">
            <div className="flex items-start gap-3">
              <Checkbox
                id="agree"
                checked={agreeToContact}
                onCheckedChange={(checked) => setAgreeToContact(checked as boolean)}
              />
              <Label htmlFor="agree" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                I agree to be contacted by Topline Flooring and Waterproofing regarding my quotation request. I understand that my information will be used solely for this purpose.
              </Label>
            </div>
          </div>

          {/* Submit */}
          {submitted ? (
            <div className="text-center py-12 bg-emerald-50 border border-emerald-200 rounded-sm">
              <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="font-display text-2xl font-semibold text-emerald-900 mb-2">Quotation Request Submitted!</h2>
              <p className="text-emerald-700 mb-6">Our team will contact you within 24 hours to discuss your project.</p>
              <Link href="/">
                <Button className="rounded-sm font-sans uppercase tracking-widest text-xs">Return Home</Button>
              </Link>
            </div>
          ) : (
            <Button type="submit" className="rounded-sm font-sans uppercase tracking-widest text-xs h-12 px-12" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Submit Quotation Request
                </>
              )}
            </Button>
          )}
        </form>
      </div>
    </CustomerLayout>
  );
}
