import { usePageVisit } from "@/hooks/use-page-visit";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Shield, Users, Zap, Star, Lightbulb, TrendingUp, Award, HardHat } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useCmsContent } from "@/hooks/use-cms-content";
import { useSeoMeta } from "@/hooks/use-seo";

const defaultValues = [
  { icon: Shield, label: "Durable", desc: "Long-lasting solutions built to withstand the harshest conditions", color: "bg-green-600" },
  { icon: Zap, label: "Cost-Effective", desc: "Competitive pricing without compromising on quality", color: "bg-sky-500" },
  { icon: Users, label: "Professional", desc: "Skilled team with years of industry expertise", color: "bg-slate-800" },
  { icon: Star, label: "Integrity", desc: "Honest, transparent business practices", color: "bg-green-600" },
  { icon: Lightbulb, label: "Innovation", desc: "Modern techniques and cutting-edge materials", color: "bg-sky-500" },
  { icon: TrendingUp, label: "Excellence", desc: "Commitment to superior quality and results", color: "bg-slate-800" },
];

const iconMap: Record<string, typeof Shield> = {
  Shield, Users, Zap, Star, Lightbulb, TrendingUp, Award, HardHat,
};

export default function About() {
  usePageVisit("/about");
  useSeoMeta('about', null, {
    title: 'About Us | Topline Flooring & Waterproofing',
    description: 'Learn about Topline Flooring and Waterproofing - Kenya\'s trusted partner for professional flooring and waterproofing solutions for over 10 years.',
  });
  const { content } = useCmsContent("about");

  const heroTitle = content.hero?.title || "Who We Are";
  const heroSubtitle = content.hero?.subtitle || "Building Trust and Protection, One Surface at a Time";
  const missionText = content.mission?.text || "For over 10 years, Topline Flooring and Waterproofing has been the trusted partner for professional flooring and waterproofing solutions across Kenya and East Africa.";
  const missionVision = content.mission?.vision || "";
  const valuesRaw = content.values?.items;
  const teamTitle = content.team?.title || "Over 10 Years of Excellence";

  let valuesList = defaultValues;
  if (valuesRaw) {
    try {
      const parsed = typeof valuesRaw === "string" ? JSON.parse(valuesRaw) : valuesRaw;
      if (Array.isArray(parsed) && parsed.length > 0) {
        valuesList = parsed.map((item: string, i: number) => {
          const def = defaultValues[i] || defaultValues[0];
          return {
            icon: iconMap[def.icon.displayName || def.icon.name] || def.icon,
            label: typeof item === "string" ? item.split(":")[0]?.trim() || item : def.label,
            desc: typeof item === "string" ? item.split(":")[1]?.trim() || item : def.desc,
            color: def.color,
          };
        });
      }
    } catch {
      // Keep defaults on parse error
    }
  }

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: "About Us" }]} />

      <section className="bg-secondary text-secondary-foreground py-20 md:py-28">
        <div className="container mx-auto px-6 md:px-12 text-center">
          <p className="text-primary text-xs uppercase tracking-[0.2em] font-sans font-medium mb-3">About Us</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">{heroTitle}</h1>
          <p className="text-secondary-foreground/60 text-sm md:text-base max-w-2xl mx-auto font-light">
            {heroSubtitle}
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div>
              <div className="bg-muted rounded-sm h-80 flex items-center justify-center">
                <HardHat className="h-20 w-20 text-muted-foreground/30" />
              </div>
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">{teamTitle}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4 font-light">
                {missionText}
              </p>
              {missionVision && (
                <p className="text-muted-foreground text-sm leading-relaxed mb-4 font-light">
                  {missionVision}
                </p>
              )}
              <p className="text-muted-foreground text-sm leading-relaxed font-light">
                From industrial warehouses to commercial spaces and residential properties, we have the expertise to handle projects of any scale.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted">
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">Our Values</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto font-light">
              The principles that guide every project we undertake
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {valuesList.map((v) => (
              <div key={v.label} className="text-center p-6 bg-background rounded-sm border border-border">
                <div className={`h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 ${v.color}`}>
                  <v.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{v.label}</h3>
                <p className="text-muted-foreground text-sm font-light">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-12 text-center">
          <Award className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">Certified & Trusted</h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto font-light mb-8">
            We partner with leading global brands to bring you the best materials and systems
          </p>
          <Link href="/contact">
            <Button className="rounded-sm">Get in Touch</Button>
          </Link>
        </div>
      </section>
    </CustomerLayout>
  );
}
