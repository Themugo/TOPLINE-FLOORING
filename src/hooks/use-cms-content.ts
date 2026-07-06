import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface CmsContent {
  id?: string;
  page: string;
  section: string;
  content: Record<string, string>;
  updated_at?: string;
}

export function useCmsContent(page: string) {
  const [content, setContent] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from("cms_content")
          .select("*")
          .eq("page", page);

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped: Record<string, Record<string, string>> = {};
          data.forEach((item: CmsContent) => {
            mapped[item.section] = item.content;
          });
          setContent(mapped);
        }
      } catch (err) {
        console.warn(`Failed to load CMS content for page "${page}":`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [page]);

  return { content, loading };
}
