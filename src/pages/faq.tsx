import { useState } from "react";
import { usePageVisit } from "@/hooks/use-page-visit";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ChevronDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useFaqItems, FaqItem } from "@/hooks/use-faq-items";

export default function FAQ() {
  usePageVisit("/faq");
  const { items, loading } = useFaqItems();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const categories = [...new Set(items.map((item) => item.category || "General").filter(Boolean))];
  const grouped = categories.length > 0
    ? categories.map((cat) => ({
        category: cat,
        items: items.filter((item) => (item.category || "General") === cat),
      }))
    : [{ category: "", items }];

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
          {grouped.map((group, gi) => (
            <div key={gi} className="mb-8">
              {group.category && (
                <h2 className="font-display text-lg font-semibold text-foreground mb-4">{group.category}</h2>
              )}
              <div className="space-y-2">
                {group.items.map((faq, i) => {
                  const globalIndex = items.indexOf(faq);
                  return (
                    <div key={faq.id} className="border border-border rounded-sm overflow-hidden">
                      <button
                        onClick={() => setOpenIndex(openIndex === globalIndex ? null : globalIndex)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-sans font-medium text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", openIndex === globalIndex && "rotate-180")} />
                      </button>
                      {openIndex === globalIndex && (
                        <div className="px-5 pb-4 text-sm text-muted-foreground font-light leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

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
