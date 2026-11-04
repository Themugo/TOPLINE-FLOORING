import { usePageVisit } from "@/hooks/use-page-visit";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Shield, Users, Zap, Star, Lightbulb, TrendingUp, Award, HardHat } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useCmsContent } from "@/hooks/use-cms-content";
import { useSeoMeta } from "@/hooks/use-seo";
import { useSiteSettings } from "@/hooks/use-data";
import { useSavedAboutPage, DEFAULT_ABOUT_IMAGE } from "@/lib/about-page";

const defaultValues = [
  { icon: Shield, label: "Durable", desc: "Long-lasting solutions built to withstand the harshest conditions", color: "bg-accent-500" },
  { icon: Zap, label: "Cost-Effective", desc: "Competitive pricing without compromising on quality", color: "bg-primary-500" },
  { icon: Users, label: "Professional", desc: "Skilled team with years of industry expertise", color: "bg-primary-700" },
  { icon: Star, label: "Integrity", desc: "Honest, transparent business practices", color: "bg-accent-500" },
  { icon: Lightbulb, label: "Innovation", desc: "Modern techniques and cutting-edge materials", color: "bg-primary-500" },
  { icon: TrendingUp, label: "Excellence", desc: "Commitment to superior quality and results", color: "bg-primary-700" },
];

const iconMap: Record<string, typeof Shield> = {
  Shield, Users, Zap, Star, Lightbulb, TrendingUp, Award, HardHat,
};

export default function About() {
  usePageVisit("/about");
  const { settings } = useSiteSettings();
  const companyName = settings.site_info?.name || settings.company?.name || 'Topline Flooring & Waterproofing';

  useSeoMeta('about', null, {
    title: `About Us | ${companyName}`,
    description: `Learn about ${companyName} - Your trusted partner for professional flooring and waterproofing solutions.`,
    breadcrumbs: [{ label: 'About Us' }],
  });
  const { content } = useCmsContent("about");

  const { saved } = useSavedAboutPage();
  const eyebrow = saved?.eyebrow || "About Us";
  const heroTitle = saved?.title || content.hero?.title || "Who We Are";
  const heroSubtitle = saved?.subtitle || content.hero?.subtitle || "Building Trust and Protection, One Surface at a Time";
  const missionText = saved?.mission || content.mission?.text || `${companyName} provides professional flooring and waterproofing solutions, from assessment and material selection to installation and handover.`;
  const missionVision = saved ? saved.vision : (content.mission?.vision || "");
  const teamTitle = saved?.team_title || content.team?.title || "The People Behind the Work";
  const closing = saved?.closing || "From industrial warehouses to commercial spaces and residential properties, we have the expertise to handle projects of any scale.";
  const photo = saved?.image_url || DEFAULT_ABOUT_IMAGE;
  const valuesTitle = saved?.values_title || "Our Values";
  const valuesSubtitle = saved?.values_subtitle || "The principles that guide every project we undertake";
  const ctaTitle = saved?.cta_title || "Certified & Trusted";
  const ctaText = saved?.cta_text || "We partner with leading global brands to bring you the best materials and systems";
  const ctaButton = saved?.cta_button || "Get in Touch";
  const valuesRaw = content.values?.items;

  let valuesList = defaultValues;
  if (saved) {
    valuesList = saved.values.map((v, i) => ({ ...defaultValues[i % defaultValues.length], label: v.label, desc: v.desc }));
  } else if (valuesRaw) {
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
          <p className="text-primary text-xs uppercase tracking-[0.2em] font-sans font-medium mb-3">{eyebrow}</p>
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
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted shadow-sm">
                <img
                  src={photo}
                  alt={teamTitle}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <HardHat aria-hidden="true" className="absolute left-1/2 top-1/2 -z-0 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/30" />
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
                {closing}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted">
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">{valuesTitle}</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto font-light">
              {valuesSubtitle}
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
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">{ctaTitle}</h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto font-light mb-8">
            {ctaText}
          </p>
          <Link href="/contact">
            <Button className="rounded-sm">{ctaButton}</Button>
          </Link>
        </div>
      </section>
    </CustomerLayout>
  );
}
