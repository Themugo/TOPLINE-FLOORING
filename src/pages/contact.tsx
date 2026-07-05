import { useState } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from "lucide-react";

export default function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: "Message Sent",
      description: "Thank you for contacting us. We will respond within 24 hours.",
    });

    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    setLoading(false);
  };

  return (
    <CustomerLayout>
      {/* Hero Section */}
      <div className="bg-secondary text-secondary-foreground py-16 md:py-20 relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-6 bg-primary" />
            <span className="text-primary text-xs uppercase tracking-[0.2em] font-sans font-medium">Get In Touch</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-semibold text-white mb-3">Contact Us</h1>
          <p className="text-secondary-foreground/50 max-w-xl font-light">Have a project in mind? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-16">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Contact Form */}
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-8">Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="mt-1.5 rounded-sm h-10"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="mt-1.5 rounded-sm h-10"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="mt-1.5 rounded-sm h-10"
                    placeholder="0720 000 000"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Subject *</Label>
                  <Input
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="mt-1.5 rounded-sm h-10"
                    placeholder="Project Inquiry"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Message *</Label>
                <Textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="mt-1.5 rounded-sm"
                  rows={5}
                  placeholder="Tell us about your project..."
                  required
                />
              </div>
              <Button type="submit" className="rounded-sm font-sans uppercase tracking-widest text-xs h-12 px-10" disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>

          {/* Contact Info */}
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-8">Contact Information</h2>

            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-sans font-medium text-foreground">Address</p>
                  <p className="text-muted-foreground font-light">Nairobi, Kenya</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-sans font-medium text-foreground">Phone Numbers</p>
                  <p className="text-muted-foreground font-light">0720 859 737</p>
                  <p className="text-muted-foreground font-light">0755 293 372</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-sans font-medium text-foreground">Email</p>
                  <p className="text-muted-foreground font-light">toplineflooringandwaterproofin@gmail.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-sans font-medium text-foreground">Business Hours</p>
                  <p className="text-muted-foreground font-light">Monday - Friday: 8:00 AM - 6:00 PM</p>
                  <p className="text-muted-foreground font-light">Saturday: 9:00 AM - 2:00 PM</p>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="h-64 bg-muted rounded-sm border border-border flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-muted-foreground font-light text-sm">Nairobi, Kenya</p>
              </div>
            </div>

            {/* WhatsApp Button */}
            <a
              href="https://wa.me/254720859737?text=Hello%20Topline%2C%20I%27d%20like%20to%20enquire%20about%20your%20flooring%20and%20waterproofing%20services."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 block"
            >
              <Button className="w-full rounded-sm font-sans uppercase tracking-widest text-xs h-12 bg-[#25D366] hover:bg-[#22c55e]">
                <MessageCircle className="h-4 w-4 mr-2" /> Chat on WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
