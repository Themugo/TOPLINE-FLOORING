export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  gallery_urls: string[];
  featured: boolean;
  in_stock: boolean;
  display_order: number;
  is_active: boolean;
  brand_id: string | null;
  sku: string | null;
  meta_title: string | null;
  meta_description: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  related_products: string[];
  created_at: string;
  updated_at: string;
  category?: Category;
  brand?: ProductBrand;
  images?: ProductImage[];
  specifications?: ProductSpecification[];
  variants?: ProductVariant[];
  documents?: ProductDocument[];
  tags?: ProductTag[];
  // Enterprise fields
  status: 'active' | 'draft' | 'archived' | 'clearance';
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_clearance: boolean;
  sale_price: number | null;
  cost_price: number | null;
  sale_start_date: string | null;
  sale_end_date: string | null;
  collection: string | null;
  material: string | null;
  origin_country: string | null;
  warranty_years: number | null;
  warranty_description: string | null;
  thickness_mm: number | null;
  weight_kg: number | null;
  dimensions: string | null;
  pack_size: string | null;
  coverage_per_unit: string | null;
  installation_method: string | null;
  is_indoor: boolean;
  is_outdoor: boolean;
  room_suitability: string[] | null;
  slip_rating: string | null;
  water_resistance: string | null;
  abrasion_rating: string | null;
  fire_rating: string | null;
  barcode: string | null;
  video_url: string | null;
  video_thumbnail: string | null;
  image_360_url: string | null;
  canonical_url: string | null;
  meta_keywords: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface ProductSpecification {
  id: string;
  product_id: string;
  spec_name: string;
  spec_value: string;
  display_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku: string | null;
  price_adjustment: number;
  stock_quantity: number;
  attributes: Record<string, any>;
  is_active: boolean;
  display_order: number;
  // Enterprise fields
  size: string | null;
  color: string | null;
  finish: string | null;
  texture: string | null;
  thickness_mm: number | null;
  pack_size: string | null;
  barcode: string | null;
  image_url: string | null;
  sale_price: number | null;
  cost_price: number | null;
  weight_kg: number | null;
  low_stock_threshold: number;
  is_default: boolean;
}

export interface ProductDocument {
  id: string;
  product_id: string;
  document_name: string;
  document_url: string;
  document_type: string;
  display_order: number;
}

export interface ProductTag {
  id: string;
  name: string;
  slug: string;
}

export interface ProductBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  is_active: boolean;
  display_order: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';
  notes: string | null;
  delivery_zone_id: string | null;
  delivery_address: string | null;
  delivery_charge: number;
  coupon_id: string | null;
  discount_amount: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  delivery?: Delivery;
  delivery_zone?: DeliveryZone;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string;
  button_text: string | null;
  button_link: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  content: string;
  avatar_url: string | null;
  rating: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Quotation {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  project_type: string | null;
  area_size: string | null;
  location: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'quoted' | 'won' | 'lost';
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AdminSettings {
  id: string;
  setting_key: string;
  setting_value: string;
  created_at: string;
  updated_at: string;
}

// New types for production features
export interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NavigationMenu {
  id: string;
  menu_name: string;
  location: string;
  label: string;
  href: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
}

export interface ThemeSetting {
  id: string;
  theme_name: string;
  preset: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  heading_font: string;
  body_font: string;
  button_style: string;
  border_radius: number;
  spacing_scale: number;
  is_active: boolean;
}

export interface HomepageSection {
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

export interface DeliveryZone {
  id: string;
  zone_name: string;
  regions: string[];
  base_charge: number;
  free_delivery_minimum: number | null;
  estimated_days: string;
  is_active: boolean;
  display_order: number;
}

export interface Delivery {
  id: string;
  order_id: string;
  zone_id: string | null;
  tracking_number: string | null;
  status: 'pending' | 'processing' | 'dispatched' | 'in_transit' | 'delivered' | 'failed';
  delivery_address: string | null;
  delivery_notes: string | null;
  scheduled_date: string | null;
  delivered_at: string | null;
  driver_name: string | null;
  driver_phone: string | null;
}

export interface Promotion {
  id: string;
  promo_type: 'banner' | 'flash_sale' | 'featured' | 'announcement' | 'popup';
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  link_text: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  display_order: number;
  position: string;
  background_color: string | null;
  text_color: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  coupon_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number | null;
  max_uses: number | null;
  current_uses: number;
  start_date: string | null;
  end_date: string | null;
  applies_to: 'all' | 'products' | 'categories';
  is_active: boolean;
}

export interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number;
}

export interface MediaFile {
  id: string;
  folder_id: string | null;
  filename: string;
  original_name: string | null;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  title: string | null;
  is_public: boolean;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  client_name: string | null;
  service_type: string | null;
  category: string | null;
  location: string | null;
  project_date: string | null;
  completion_date: string | null;
  project_value: number | null;
  area_size: string | null;
  description: string | null;
  challenge: string | null;
  solution: string | null;
  results: string | null;
  featured: boolean;
  is_active: boolean;
  display_order: number;
  images?: ProjectImage[];
}

export interface ProjectImage {
  id: string;
  project_id: string;
  image_url: string;
  image_type: 'before' | 'after' | 'progress' | 'other';
  caption: string | null;
  display_order: number;
}

export interface SeoPage {
  id: string;
  page_type: string;
  page_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  structured_data: Record<string, any> | null;
  no_index: boolean;
  no_follow: boolean;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  variant_id: string | null;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number | null;
  new_stock: number | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  product?: Product;
}

export interface InventoryAlert {
  id: string;
  product_id: string;
  variant_id: string | null;
  alert_type: string;
  threshold: number;
  current_stock: number;
  is_resolved: boolean;
  resolved_at: string | null;
  product?: Product;
}

export interface ActivityLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Enterprise Product Catalog Types
export interface ProductCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCollectionRelation {
  product_id: string;
  collection_id: string;
  display_order: number;
}

export interface ProductReview {
  id: string;
  product_id: string;
  customer_id: string | null;
  customer_name: string;
  rating: number;
  title: string | null;
  content: string | null;
  pros: string[] | null;
  cons: string[] | null;
  verified_purchase: boolean;
  helpful_votes: number;
  is_approved: boolean;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
  images?: ReviewImage[];
}

export interface ReviewImage {
  id: string;
  review_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface Wishlist {
  id: string;
  customer_id: string;
  product_id: string;
  variant_id: string | null;
  added_at: string;
  product?: Product;
  variant?: ProductVariant;
}

export interface RecentlyViewed {
  id: string;
  customer_id: string | null;
  session_id: string | null;
  product_id: string;
  viewed_at: string;
  product?: Product;
}

export interface ProductComparison {
  id: string;
  customer_id: string | null;
  session_id: string | null;
  product_ids: string[];
  created_at: string;
  updated_at: string;
  products?: Product[];
}
