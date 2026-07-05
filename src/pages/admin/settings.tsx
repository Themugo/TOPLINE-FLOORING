import { useState, useEffect } from "react";
import { useListSettings, useUpdateMultipleSettings } from "@/lib/admin-api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Settings, Globe, Phone, Mail, MapPin, Clock, Image, FileText, Palette, BarChart, Code } from "lucide-react";
import { useChangePassword, useGetAdminMe } from "@/lib/api";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";

const defaultSettings: Record<string, string> = {
  company_name: "Topline Flooring and Waterproofing",
  company_tagline: "Professional Flooring & Waterproofing Solutions",
  company_description: "Topline Flooring and Waterproofing is Kenya's premier provider of professional flooring and waterproofing solutions.",
  company_address: "Nairobi, Kenya",
  company_phone1: "0720 859 737",
  company_phone2: "0755 293 372",
  company_email: "toplineflooringandwaterproofin@gmail.com",
  company_hours: "Mon-Sat: 8:00 AM - 6:00 PM",
  company_whatsapp: "254720859737",
  logo_url: "",
  favicon_url: "",
  footer_text: "Building Trust and Protection, One Surface at a Time.",
  copyright_text: "© 2024 Topline Flooring and Waterproofing. All rights reserved.",
  google_maps_embed: "",
  social_facebook: "",
  social_instagram: "",
  social_twitter: "",
  social_linkedin: "",
  social_youtube: "",
  seo_title: "Topline Flooring and Waterproofing | Professional Solutions in Kenya",
  seo_description: "Topline Flooring and Waterproofing offers premium flooring and waterproofing services in Kenya.",
  seo_keywords: "flooring, waterproofing, Kenya, Nairobi, epoxy, tiles, concrete, sealing",
  google_analytics_id: "",
  google_tag_manager_id: "",
  theme_primary: "#C7A368",
  theme_secondary: "#1E3A5F",
  theme_accent: "#0EA5E9",
  theme_mode: "light",
  theme_radius: "0.25rem",
  theme_button_style: "rounded",
  theme_header_style: "default",
  theme_footer_style: "default",
  layout_preset: "modern",
  hero_height_desktop: "60",
  hero_height_mobile: "45",
  hero_transition_speed: "4000",
  hero_pause_on_hover: "true",
};

export default function AdminSettings() {
  const [formData, setFormData] = useState<Record<string, string>>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useListSettings();
  const updateSettings = useUpdateMultipleSettings();

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const { data: session } = useGetAdminMe();
  const changePassword = useChangePassword();

  // Merge loaded settings with defaults when data arrives
  useEffect(() => {
    if (settings) {
      setFormData({ ...defaultSettings, ...settings });
    }
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData, {
      onSuccess: () => {
        setHasChanges(false);
        queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      },
    });
  };

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    changePassword.mutate(
      { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword },
      {
        onSuccess: () => {
          setPasswordSuccess(true);
          setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
          setTimeout(() => setPasswordSuccess(false), 3000);
        },
        onError: (err: any) => {
          setPasswordError(err?.message || "Failed to change password");
        },
      }
    );
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);
  const strengthColors = ["bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500", "bg-emerald-600"];
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 rounded-sm" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">
            Configuration
          </p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Site Settings</h1>
        </div>
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="rounded-sm font-sans uppercase tracking-widest text-xs h-9"
          >
            <Save className="h-3.5 w-3.5 mr-2" />
            {updateSettings.isPending ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground font-light mb-6">
        Configure your website settings, company information, and SEO metadata. All changes are saved to the database and reflected across the website.
      </p>

      {/* Account Security Section */}
      <div className="bg-card border border-border rounded-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Account Security
            </h3>
            <p className="text-sm text-muted-foreground font-light">Logged in as: {session?.username}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="rounded-sm text-xs"
          >
            Change Password
          </Button>
        </div>

        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} className="border-t border-border pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Current Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    className="rounded-sm h-9 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">New Password</Label>
                <Input
                  type={showPasswords ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className="rounded-sm h-9 mt-1"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans">Confirm Password</Label>
                <Input
                  type={showPasswords ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className="rounded-sm h-9 mt-1"
                  required
                />
              </div>
            </div>
            {passwordForm.newPassword && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-1 max-w-xs">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {strengthLabels[Math.max(0, passwordStrength - 1)] || "Very Weak"}
                </span>
              </div>
            )}
            {passwordError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="flex items-center gap-2 text-emerald-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Password changed successfully
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={changePassword.isPending} className="rounded-sm text-xs">
                {changePassword.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Update Password
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPasswordForm(false)} className="rounded-sm text-xs">
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      <form onSubmit={handleSave}>
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="bg-muted rounded-sm p-1 h-auto flex-wrap gap-1">
            <TabsTrigger value="company" className="rounded-sm text-xs font-sans uppercase tracking-widest data-[state=active]:bg-card">
              Company
            </TabsTrigger>
            <TabsTrigger value="branding" className="rounded-sm text-xs font-sans uppercase tracking-widest data-[state=active]:bg-card">
              Branding
            </TabsTrigger>
            <TabsTrigger value="contact" className="rounded-sm text-xs font-sans uppercase tracking-widest data-[state=active]:bg-card">
              Contact
            </TabsTrigger>
            <TabsTrigger value="social" className="rounded-sm text-xs font-sans uppercase tracking-widest data-[state=active]:bg-card">
              Social
            </TabsTrigger>
            <TabsTrigger value="seo" className="rounded-sm text-xs font-sans uppercase tracking-widest data-[state=active]:bg-card">
              SEO
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-sm text-xs font-sans uppercase tracking-widest data-[state=active]:bg-card">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="hero" className="rounded-sm text-xs font-sans uppercase tracking-widest data-[state=active]:bg-card">
              Hero
            </TabsTrigger>
            <TabsTrigger value="theme" className="rounded-sm text-xs font-sans uppercase tracking-widest data-[state=active]:bg-card">
              Theme
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4">
            <div className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest font-sans">Company Name</Label>
                  <Input value={formData.company_name} onChange={(e) => handleChange("company_name", e.target.value)} className="mt-1 rounded-sm" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest font-sans">Tagline</Label>
                  <Input value={formData.company_tagline} onChange={(e) => handleChange("company_tagline", e.target.value)} className="mt-1 rounded-sm" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest font-sans">Description</Label>
                  <Textarea value={formData.company_description} onChange={(e) => handleChange("company_description", e.target.value)} className="mt-1 rounded-sm" rows={4} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <div className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                Branding & Assets
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest font-sans">Logo URL</Label>
                  <Input value={formData.logo_url} onChange={(e) => handleChange("logo_url", e.target.value)} className="mt-1 rounded-sm" placeholder="https://..." />
                  {formData.logo_url && <img src={formData.logo_url} alt="Logo preview" className="mt-2 h-12 rounded-sm border border-border" onError={(e) => (e.currentTarget.style.display = "none")} />}
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest font-sans">Favicon URL</Label>
                  <Input value={formData.favicon_url} onChange={(e) => handleChange("favicon_url", e.target.value)} className="mt-1 rounded-sm" placeholder="https://..." />
                  {formData.favicon_url && <img src={formData.favicon_url} alt="Favicon preview" className="mt-2 h-8 w-8 rounded-sm border border-border" onError={(e) => (e.currentTarget.style.display = "none")} />}
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Footer Text</Label>
                  <Textarea value={formData.footer_text} onChange={(e) => handleChange("footer_text", e.target.value)} className="mt-1 rounded-sm" rows={2} />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Copyright Text</Label>
                  <Input value={formData.copyright_text} onChange={(e) => handleChange("copyright_text", e.target.value)} className="mt-1 rounded-sm" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <div className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Primary Phone</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={formData.company_phone1} onChange={(e) => handleChange("company_phone1", e.target.value)} className="pl-10 rounded-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Secondary Phone</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={formData.company_phone2} onChange={(e) => handleChange("company_phone2", e.target.value)} className="pl-10 rounded-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Email Address</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" value={formData.company_email} onChange={(e) => handleChange("company_email", e.target.value)} className="pl-10 rounded-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">WhatsApp Number</Label>
                  <Input value={formData.company_whatsapp} onChange={(e) => handleChange("company_whatsapp", e.target.value)} className="mt-1 rounded-sm" placeholder="254720859737" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest font-sans">Physical Address</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input value={formData.company_address} onChange={(e) => handleChange("company_address", e.target.value)} className="pl-10 rounded-sm" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest font-sans">Business Hours</Label>
                  <div className="relative mt-1">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={formData.company_hours} onChange={(e) => handleChange("company_hours", e.target.value)} className="pl-10 rounded-sm" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest font-sans">Google Maps Embed URL</Label>
                  <Textarea value={formData.google_maps_embed} onChange={(e) => handleChange("google_maps_embed", e.target.value)} className="mt-1 rounded-sm font-mono text-xs" rows={3} placeholder="<iframe src=...></iframe>" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <div className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Social Media Links
              </h3>
              <p className="text-sm text-muted-foreground font-light">Add your social media profile URLs. Leave empty to hide the link.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Facebook</Label>
                  <Input value={formData.social_facebook} onChange={(e) => handleChange("social_facebook", e.target.value)} className="mt-1 rounded-sm" placeholder="https://facebook.com/..." />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Instagram</Label>
                  <Input value={formData.social_instagram} onChange={(e) => handleChange("social_instagram", e.target.value)} className="mt-1 rounded-sm" placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Twitter / X</Label>
                  <Input value={formData.social_twitter} onChange={(e) => handleChange("social_twitter", e.target.value)} className="mt-1 rounded-sm" placeholder="https://twitter.com/..." />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">LinkedIn</Label>
                  <Input value={formData.social_linkedin} onChange={(e) => handleChange("social_linkedin", e.target.value)} className="mt-1 rounded-sm" placeholder="https://linkedin.com/company/..." />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">YouTube</Label>
                  <Input value={formData.social_youtube} onChange={(e) => handleChange("social_youtube", e.target.value)} className="mt-1 rounded-sm" placeholder="https://youtube.com/..." />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <div className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                SEO Settings
              </h3>
              <p className="text-sm text-muted-foreground font-light">Control how your site appears in search results and social shares.</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Site Title</Label>
                  <Input value={formData.seo_title} onChange={(e) => handleChange("seo_title", e.target.value)} className="mt-1 rounded-sm" />
                  <p className="text-xs text-muted-foreground mt-1">Recommended: 50-60 characters. Current: {formData.seo_title?.length || 0}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Meta Description</Label>
                  <Textarea value={formData.seo_description} onChange={(e) => handleChange("seo_description", e.target.value)} className="mt-1 rounded-sm" rows={3} />
                  <p className="text-xs text-muted-foreground mt-1">Recommended: 150-160 characters. Current: {formData.seo_description?.length || 0}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Keywords</Label>
                  <Textarea value={formData.seo_keywords} onChange={(e) => handleChange("seo_keywords", e.target.value)} className="mt-1 rounded-sm" rows={2} placeholder="comma-separated keywords" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <BarChart className="h-4 w-4 text-primary" />
                Analytics & Tracking
              </h3>
              <p className="text-sm text-muted-foreground font-light">Connect analytics services to track website performance.</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Google Analytics ID</Label>
                  <div className="relative mt-1">
                    <Code className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={formData.google_analytics_id} onChange={(e) => handleChange("google_analytics_id", e.target.value)} className="pl-10 rounded-sm" placeholder="G-XXXXXXXXXX" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Google Tag Manager ID</Label>
                  <div className="relative mt-1">
                    <Code className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={formData.google_tag_manager_id} onChange={(e) => handleChange("google_tag_manager_id", e.target.value)} className="pl-10 rounded-sm" placeholder="GTM-XXXXXXX" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hero" className="space-y-4">
            <div className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                Hero Slider Settings
              </h3>
              <p className="text-sm text-muted-foreground font-light">Configure the homepage hero slider behavior.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Desktop Height (%vh)</Label>
                  <Input value={formData.hero_height_desktop} onChange={(e) => handleChange("hero_height_desktop", e.target.value)} className="mt-1 rounded-sm" type="number" min={30} max={100} />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Mobile Height (%vh)</Label>
                  <Input value={formData.hero_height_mobile} onChange={(e) => handleChange("hero_height_mobile", e.target.value)} className="mt-1 rounded-sm" type="number" min={25} max={80} />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Transition Speed (ms)</Label>
                  <Input value={formData.hero_transition_speed} onChange={(e) => handleChange("hero_transition_speed", e.target.value)} className="mt-1 rounded-sm" type="number" min={2000} max={10000} step={500} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="pause_hover"
                    checked={formData.hero_pause_on_hover === "true"}
                    onChange={(e) => handleChange("hero_pause_on_hover", e.target.checked ? "true" : "false")}
                    className="rounded border-border"
                  />
                  <Label htmlFor="pause_hover" className="text-sm">Pause on Hover</Label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="theme" className="space-y-4">
            <div className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Theme Colors
              </h3>
              <p className="text-sm text-muted-foreground font-light">Customize your brand colors applied across the website.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Primary Color</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="h-10 w-10 rounded-sm border border-border" style={{ backgroundColor: formData.theme_primary }} />
                    <Input value={formData.theme_primary} onChange={(e) => handleChange("theme_primary", e.target.value)} className="flex-1 rounded-sm" />
                    <input type="color" value={formData.theme_primary} onChange={(e) => handleChange("theme_primary", e.target.value)} className="h-10 w-10 rounded cursor-pointer" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Secondary Color</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="h-10 w-10 rounded-sm border border-border" style={{ backgroundColor: formData.theme_secondary }} />
                    <Input value={formData.theme_secondary} onChange={(e) => handleChange("theme_secondary", e.target.value)} className="flex-1 rounded-sm" />
                    <input type="color" value={formData.theme_secondary} onChange={(e) => handleChange("theme_secondary", e.target.value)} className="h-10 w-10 rounded cursor-pointer" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans">Accent Color</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="h-10 w-10 rounded-sm border border-border" style={{ backgroundColor: formData.theme_accent }} />
                    <Input value={formData.theme_accent} onChange={(e) => handleChange("theme_accent", e.target.value)} className="flex-1 rounded-sm" />
                    <input type="color" value={formData.theme_accent} onChange={(e) => handleChange("theme_accent", e.target.value)} className="h-10 w-10 rounded cursor-pointer" />
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-muted/30 rounded-sm">
                <p className="text-xs text-muted-foreground mb-2">Preview</p>
                <div className="flex items-center gap-4">
                  <button className="px-4 py-2 rounded-sm text-sm font-sans uppercase tracking-widest text-white" style={{ backgroundColor: formData.theme_primary }}>Primary</button>
                  <button className="px-4 py-2 rounded-sm text-sm font-sans uppercase tracking-widest text-white" style={{ backgroundColor: formData.theme_secondary }}>Secondary</button>
                  <button className="px-4 py-2 rounded-sm text-sm font-sans uppercase tracking-widest text-white" style={{ backgroundColor: formData.theme_accent }}>Accent</button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </AdminLayout>
  );
}
