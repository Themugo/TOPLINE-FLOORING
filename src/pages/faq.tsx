import { useState } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ChevronDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    q: "What types of flooring do you offer?",
    a: "We specialize in industrial flooring, epoxy coatings, concrete sealers, polished concrete, and decorative flooring solutions for commercial and residential spaces.",
  },
  {
    q: "Do you provide waterproofing services?",
    a: "Yes, we offer comprehensive waterproofing including APP bituminous membrane, basement waterproofing, roof coating, foundation waterproofing, and wet area waterproofing.",
  },
  {
    q: "How long does a typical flooring project take?",
    a: "Project duration depends on scope and size. A standard industrial floor can take 3-7 days including preparation, application, and curing. We provide a detailed timeline during consultation.",
  },
  {
    q: "Do you offer free quotations?",
    a: "Yes, we provide free, no-obligation quotations for all projects. Fill out our quotation form or contact us directly and we'll get back to you within 24 hours.",
  },
  {
    q: "What areas do you serve?",
    a: "We serve Nairobi, major cities across Kenya, and select locations in East Africa. Contact us to confirm service availability in your area.",
  },
  {
    q: "Are your materials and services guaranteed?",
    a: "Yes, we use high-quality materials from certified global brands and provide workmanship guarantees on all our installations. Specific warranty periods depend on the project type.",
  },
  {
    q: "Do you sell materials for DIY projects?",
    a: "Absolutely! Visit our Materials Shop to purchase waterproofing membranes, epoxy resins, sealants, and other professional-grade products for your DIY projects.",
  },
  {
    q: "How do I maintain my epoxy floor?",
    a: "Epoxy floors are low maintenance. Regular sweeping and occasional damp mopping with mild detergent is sufficient. Avoid harsh chemicals and use protective pads under heavy equipment.",
  },
  {
    q: "Can you work on an existing floor?",
    a: "Yes, we can prepare and apply coatings over existing concrete floors. The surface needs to be properly cleaned, repaired, and prepared for optimal adhesion.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept M-Pesa, bank transfers, and cash payments. Payment terms are discussed during the quotation stage and may include deposit and milestone-based schedules.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "FAQs" }]} />

      <section className="bg-secondary text-secondary-foreground py-20 md:py-28">
        <div className="container mx-auto px-6 md:px-12 text-center">
          <p className="text-primary text-xs uppercase tracking-[0.2em] font-sans font-medium mb-3">FAQs</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-secondary-foreground/60 text-sm md:text-base max-w-2xl mx-auto font-light">
            Everything you need to know about our services
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-12 max-w-3xl">
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border rounded-sm overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-sans font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", openIndex === i && "rotate-180")} />
                </button>
                {openIndex === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground font-light leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center p-8 bg-muted rounded-sm">
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">Still have questions?</h2>
            <p className="text-sm text-muted-foreground font-light mb-5">We're here to help. Reach out to us anytime.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/contact">
                <Button className="rounded-sm">Contact Us</Button>
              </Link>
              <a href="https://wa.me/254720859737" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="rounded-sm">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
