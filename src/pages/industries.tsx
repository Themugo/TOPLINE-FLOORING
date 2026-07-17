import { useState, useEffect } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Building2, Warehouse, ShoppingBag, Stethoscope, School, Building, Ship, Trees, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { usePageVisit } from "@/hooks/use-page-visit";

const FALLBACK_INDUSTRIES = [
  { icon: "Warehouse", title: "Industrial", desc: "Heavy-duty flooring and waterproofing for factories, warehouses, and manufacturing plants.", href: "/shop?type=service" },
  { icon: "Building2", title: "Commercial", desc: "High-traffic flooring solutions for offices, retail spaces, and commercial complexes.", href: "/shop?type=service" },
  { icon: "ShoppingBag", title: "Retail", desc: "Durable and aesthetically pleasing floors for showrooms, malls, and stores.", href: "/shop?type=service" },
  { icon: "Stethoscope", title: "Healthcare", desc: "Hygienic, chemical-resistant flooring for hospitals, clinics, and laboratories.", href: "/shop?type=service" },
  { icon: "School", title: "Education", desc: "Safe and durable flooring for schools, universities, and training facilities.", href: "/shop?type=service" },
  { icon: "Building", title: "Residential", desc: "Quality flooring and waterproofing for apartments, homes, and housing complexes.", href: "/shop?type=service" },
  { icon: "Ship", title: "Marine", desc: "Waterproofing and coating solutions for docks, ports, and marine structures.", href: "/shop?type=service" },
  { icon: "Trees", title: "Infrastructure", desc: "Large-scale waterproofing for bridges, tunnels, and public infrastructure.", href: "/quotation" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = { Building2, Warehouse, ShoppingBag, Stethoscope, School, Building, Ship, Trees };

export default function Industries() {
  usePageVisit("/industries");

  const [industries, setIndustries] = useState<{ icon: string; title: string; desc: string; href: string }[]>(FALLBACK_INDUSTRIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const icons = ["Building2", "Warehouse", "ShoppingBag", "Stethoscope", "School", "Building", "Ship", "Trees"];
          const mapped = data.map((c, i) => ({
            icon: icons[i % icons.length],
            title: c.name,
            desc: c.description || `Professional ${c.name.toLowerCase()} solutions tailored to your needs.`,
            href: `/shop?category=${c.slug}`,
          }));
          setIndustries(mapped);
        }
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "Industries Served" }]} />

      <section className="bg-secondary text-secondary-foreground py-20 md:py-28">
        <div className="container mx-auto px-6 md:px-12 text-center">
          <p className="text-primary text-xs uppercase tracking-[0.2em] font-sans font-medium mb-3">Industries</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Industries We Serve</h1>
          <p className="text-secondary-foreground/60 text-sm md:text-base max-w-2xl mx-auto font-light">
            Tailored flooring and waterproofing solutions for every sector
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="p-6 bg-background border border-border rounded-sm">
                    <Skeleton className="h-10 w-10 mb-4" />
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))
              : industries.map((ind) => {
                  const Icon = ICON_MAP[ind.icon];
                  return (
                    <Link key={ind.title} href={ind.href} className="group p-6 bg-background border border-border rounded-sm hover:border-primary/40 hover:shadow-lg transition-all">
                      {Icon && <Icon className="h-10 w-10 text-primary mb-4 group-hover:scale-110 transition-transform" />}
                      <h3 className="font-display font-semibold text-foreground mb-2">{ind.title}</h3>
                      <p className="text-muted-foreground text-sm font-light leading-relaxed">{ind.desc}</p>
                    </Link>
                  );
                })}
          </div>

          <div className="mt-16 text-center bg-muted rounded-sm p-12">
            <h2 className="font-display text-2xl font-bold text-foreground mb-3">Not sure which solution fits your industry?</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto font-light">
              Contact our team for a free consultation and expert advice tailored to your specific needs.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/contact">
                <Button className="rounded-sm">Contact Us <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
              <Link href="/quotation">
                <Button variant="outline" className="rounded-sm">Get a Quote</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
