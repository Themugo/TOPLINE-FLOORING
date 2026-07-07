import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function usePageVisit(pagePath: string) {
  useEffect(() => {
    if (!supabase || !pagePath) return;

    const record = async () => {
      try {
        const { error } = await supabase.from("page_visits").insert({
          page_path: pagePath,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent || null,
        });
        if (error) console.warn("Failed to record page visit:", error);
      } catch {
        // Silently fail - analytics should never break the app
      }
    };

    const timer = setTimeout(record, 500);
    return () => clearTimeout(timer);
  }, [pagePath]);
}
