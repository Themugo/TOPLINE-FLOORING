import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  display_order?: number;
}

const defaultFaqs: FaqItem[] = [
  {
    id: "1",
    question: "What types of flooring do you offer?",
    answer: "We specialize in industrial flooring, epoxy coatings, concrete sealers, polished concrete, and decorative flooring solutions for commercial and residential spaces.",
    category: "Flooring",
  },
  {
    id: "2",
    question: "Do you provide waterproofing services?",
    answer: "Yes, we offer comprehensive waterproofing including APP bituminous membrane, basement waterproofing, roof coating, foundation waterproofing, and wet area waterproofing.",
    category: "Waterproofing",
  },
  {
    id: "3",
    question: "How long does a typical flooring project take?",
    answer: "Project duration depends on scope and size. A standard industrial floor can take 3-7 days including preparation, application, and curing. We provide a detailed timeline during consultation.",
    category: "Flooring",
  },
  {
    id: "4",
    question: "Do you offer free quotations?",
    answer: "Yes, we provide free, no-obligation quotations for all projects. Fill out our quotation form or contact us directly and we'll get back to you within 24 hours.",
    category: "General",
  },
  {
    id: "5",
    question: "What areas do you serve?",
    answer: "We serve Nairobi, major cities across Kenya, and select locations in East Africa. Contact us to confirm service availability in your area.",
    category: "General",
  },
  {
    id: "6",
    question: "Are your materials and services guaranteed?",
    answer: "Yes, we use high-quality materials from certified global brands and provide workmanship guarantees on all our installations. Specific warranty periods depend on the project type.",
    category: "General",
  },
  {
    id: "7",
    question: "Do you sell materials for DIY projects?",
    answer: "Absolutely! Visit our Materials Shop to purchase waterproofing membranes, epoxy resins, sealants, and other professional-grade products for your DIY projects.",
    category: "General",
  },
  {
    id: "8",
    question: "How do I maintain my epoxy floor?",
    answer: "Epoxy floors are low maintenance. Regular sweeping and occasional damp mopping with mild detergent is sufficient. Avoid harsh chemicals and use protective pads under heavy equipment.",
    category: "Flooring",
  },
  {
    id: "9",
    question: "Can you work on an existing floor?",
    answer: "Yes, we can prepare and apply coatings over existing concrete floors. The surface needs to be properly cleaned, repaired, and prepared for optimal adhesion.",
    category: "Flooring",
  },
  {
    id: "10",
    question: "What payment methods do you accept?",
    answer: "We accept M-Pesa, bank transfers, and cash payments. Payment terms are discussed during the quotation stage and may include deposit and milestone-based schedules.",
    category: "General",
  },
];

export function useFaqItems() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setItems(defaultFaqs);
      setLoading(false);
      return;
    }

    supabase
      .from("faq_items")
      .select("*")
      .order("display_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setItems(data as FaqItem[]);
        } else {
          setItems(defaultFaqs);
        }
      })
      .catch(() => {
        setItems(defaultFaqs);
      })
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
}
