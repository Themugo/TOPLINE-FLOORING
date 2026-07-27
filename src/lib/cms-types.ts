/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  HeroSlide,
  Testimonial,
  Partner,
  Project,
  SeoPage,
  MediaFolder,
  MediaFile,
} from './types';

// ============================================================
// 13 Logical Content Groups for CMS
// ============================================================

export interface WebsiteSettingsGroup {
  site_info: {
    name: string;
    tagline: string;
    logo_url: string;
    favicon_url: string;
    description: string;
    url: string;
  };
  company: {
    name: string;
    legal_name: string;
    tax_id: string;
    registration_number: string;
  };
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
    city: string;
    working_hours: string;
  };
  social: {
    facebook: string;
    instagram: string;
    linkedin: string;
    twitter: string;
    youtube: string;
  };
  localization: {
    currency_code: string;
    currency_symbol: string;
    language: string;
    timezone: string;
  };
}

export interface HomepageBuilderSection {
  id: string;
  section_type: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: Record<string, any>;
  display_order: number;
  is_active: boolean;
  background_color: string | null;
  background_image: string | null;
  padding: string;
}

export interface ValueProp {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
}

export interface HomepageGroup {
  hero_slides: HeroSlide[];
  value_props: ValueProp[];
  sections: HomepageBuilderSection[];
  banner: {
    title: string;
    subtitle: string;
    button_text: string;
    button_link: string;
    background_image: string;
    is_active: boolean;
  };
}

export interface AboutGroup {
  hero: {
    title: string;
    subtitle: string;
    background_image: string;
  };
  story: {
    heading: string;
    paragraph_1: string;
    paragraph_2: string;
    image_url: string;
  };
  mission: {
    title: string;
    description: string;
  };
  vision: {
    title: string;
    description: string;
  };
  core_values: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  stats: Array<{
    label: string;
    value: string;
    prefix?: string;
    suffix?: string;
  }>;
  team: Array<{
    name: string;
    role: string;
    bio: string;
    avatar_url: string;
  }>;
}

export interface ServiceItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  icon: string;
  image_url: string;
  features: string[];
  is_active: boolean;
  display_order: number;
}

export interface ServicesGroup {
  catalog: ServiceItem[];
  categories: string[];
  process_steps: Array<{
    step_number: number;
    title: string;
    description: string;
    icon: string;
  }>;
  cta_banner: {
    title: string;
    subtitle: string;
    button_text: string;
    link: string;
  };
}

export interface MapLocation {
  id: string;
  title: string;
  lat: number;
  lng: number;
  region: string;
  location_text: string;
}

export interface ProjectsGroup {
  portfolio: Project[];
  map_locations: MapLocation[];
  material_specs: string[];
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  before_image_url: string;
  after_image_url: string;
  description: string;
  tags: string[];
}

export interface GalleryGroup {
  items: GalleryItem[];
  categories: string[];
}

export interface TestimonialsGroup {
  reviews: Testimonial[];
  corporate_partners: Partner[];
  trust_metrics: {
    rating: number;
    total_reviews: number;
    satisfaction_rate: string;
  };
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  display_order: number;
  keywords?: string[];
}

export interface FaqGroup {
  items: FaqItem[];
  categories: string[];
}

export interface ContactOffice {
  name: string;
  address: string;
  phone: string;
  email: string;
  working_hours: string;
  lat?: number;
  lng?: number;
  is_primary: boolean;
}

export interface ContactGroup {
  header: {
    title: string;
    subtitle: string;
  };
  offices: ContactOffice[];
  map_settings: {
    center_lat: number;
    center_lng: number;
    zoom: number;
    embed_url?: string;
  };
  form_options: {
    project_types: string[];
    budget_ranges: string[];
    enable_attachment: boolean;
  };
}

export interface FooterGroup {
  columns: Array<{
    title: string;
    links: Array<{
      label: string;
      href: string;
      open_in_new_tab?: boolean;
    }>;
  }>;
  copyright: string;
  legal_disclaimer: string;
  newsletter: {
    title: string;
    description: string;
    placeholder: string;
    button_text: string;
  };
}

export interface SeoGroup {
  pages: Record<string, SeoPage>;
  global_default: {
    site_name: string;
    title_template: string;
    default_description: string;
    default_og_image: string;
    default_keywords: string;
  };
}

export interface MediaLibraryGroup {
  folders: MediaFolder[];
  files: MediaFile[];
}

export interface ThemeSettingsGroup {
  preset: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  heading_font: string;
  body_font: string;
  button_style: string;
  border_radius: number;
  spacing_scale: number;
  layout_style: 'classic' | 'showcase';
}

// Master CMS State Container
export interface CMSContentStore {
  website_settings: WebsiteSettingsGroup;
  homepage: HomepageGroup;
  about: AboutGroup;
  services: ServicesGroup;
  projects: ProjectsGroup;
  gallery: GalleryGroup;
  testimonials: TestimonialsGroup;
  faq: FaqGroup;
  contact: ContactGroup;
  footer: FooterGroup;
  seo: SeoGroup;
  media_library: MediaLibraryGroup;
  theme_settings: ThemeSettingsGroup;
}

export type CMSGroupKey = keyof CMSContentStore;
