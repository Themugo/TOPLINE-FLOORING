import { Link } from "wouter";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <CustomerLayout>
      <div className="container mx-auto px-6 md:px-12 py-32 text-center">
        <p className="font-display text-8xl md:text-9xl font-semibold text-primary/20 mb-6 leading-none">404</p>
        <div className="flex items-center gap-3 justify-center mb-5">
          <div className="h-px w-8 bg-primary/40" />
          <span className="text-primary text-xs uppercase tracking-[0.2em] font-sans font-medium">Page Not Found</span>
          <div className="h-px w-8 bg-primary/40" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-foreground mb-4">We couldn't find that page</h1>
        <p className="text-muted-foreground font-light mb-10 max-w-md mx-auto">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="rounded-sm font-sans uppercase tracking-widest text-xs px-8 h-11">
              <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back to Home
            </Button>
          </Link>
          <Link href="/shop">
            <Button variant="outline" className="rounded-sm font-sans uppercase tracking-widest text-xs px-8 h-11">
              Browse Services
            </Button>
          </Link>
        </div>
      </div>
    </CustomerLayout>
  );
}
