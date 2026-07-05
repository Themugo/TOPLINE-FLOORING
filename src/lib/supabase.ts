import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Log env vars in development
if (import.meta.env.DEV) {
  console.log('Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.log('Supabase Anon Key:', supabaseAnonKey ? 'SET' : 'NOT SET');
}

export const isConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          unit: string;
          image_url: string | null;
          gallery_urls: string[];
          featured: boolean;
          in_stock: boolean;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          product_type?: 'service' | 'material';
          sku?: string;
          stock_quantity?: number;
          low_stock_threshold?: number;
          meta_title?: string;
          meta_description?: string;
          brand_id?: string;
          category_name?: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          price: number;
          unit?: string;
          image_url?: string | null;
          gallery_urls?: string[];
          featured?: boolean;
          in_stock?: boolean;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          product_type?: 'service' | 'material';
          sku?: string;
          stock_quantity?: number;
          low_stock_threshold?: number;
          meta_title?: string;
          meta_description?: string;
          brand_id?: string;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          unit?: string;
          image_url?: string | null;
          gallery_urls?: string[];
          featured?: boolean;
          in_stock?: boolean;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          product_type?: 'service' | 'material';
          sku?: string;
          stock_quantity?: number;
          low_stock_threshold?: number;
          meta_title?: string;
          meta_description?: string;
          brand_id?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          company: string | null;
          address: string | null;
          city: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone: string;
          company?: string | null;
          address?: string | null;
          city?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          company?: string | null;
          address?: string | null;
          city?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          customer_id: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          total_amount: number;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          total_amount: number;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          total_amount?: number;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
      };
      admin_sessions: {
        Row: {
          id: string;
          username: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id: string;
          username: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          username?: string;
          created_at?: string;
          expires_at?: string;
        };
      };
      hero_slides: {
        Row: {
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
        };
        Insert: {
          id?: string;
          title: string;
          subtitle?: string | null;
          description?: string | null;
          image_url: string;
          button_text?: string | null;
          button_link?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subtitle?: string | null;
          description?: string | null;
          image_url?: string;
          button_text?: string | null;
          button_link?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      testimonials: {
        Row: {
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
        };
        Insert: {
          id?: string;
          name: string;
          role?: string | null;
          company?: string | null;
          content: string;
          avatar_url?: string | null;
          rating?: number;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: string | null;
          company?: string | null;
          content?: string;
          avatar_url?: string | null;
          rating?: number;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      partners: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          website_url: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          website_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          website_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      quotations: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          company: string | null;
          project_type: string | null;
          area_size: string | null;
          location: string | null;
          message: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone: string;
          company?: string | null;
          project_type?: string | null;
          area_size?: string | null;
          location?: string | null;
          message?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          company?: string | null;
          project_type?: string | null;
          area_size?: string | null;
          location?: string | null;
          message?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      admin_settings: {
        Row: {
          id: string;
          setting_key: string;
          setting_value: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          setting_key: string;
          setting_value: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          setting_key?: string;
          setting_value?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      promotions: {
        Row: {
          id: string;
          promo_type: string;
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
          position: string;
          background_color: string | null;
          text_color: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          promo_type: string;
          title: string;
          subtitle?: string | null;
          description?: string | null;
          image_url?: string | null;
          link_url?: string | null;
          link_text?: string | null;
          discount_percent?: number | null;
          discount_amount?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          is_active?: boolean;
          position?: string;
          background_color?: string | null;
          text_color?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          promo_type?: string;
          title?: string;
          subtitle?: string | null;
          description?: string | null;
          image_url?: string | null;
          link_url?: string | null;
          link_text?: string | null;
          discount_percent?: number | null;
          discount_amount?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          is_active?: boolean;
          position?: string;
          background_color?: string | null;
          text_color?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          coupon_type: 'percentage' | 'fixed';
          discount_value: number;
          min_order_value: number | null;
          max_uses: number | null;
          current_uses: number;
          start_date: string | null;
          end_date: string | null;
          applies_to: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          coupon_type: 'percentage' | 'fixed';
          discount_value: number;
          min_order_value?: number | null;
          max_uses?: number | null;
          current_uses?: number;
          start_date?: string | null;
          end_date?: string | null;
          applies_to?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          coupon_type?: 'percentage' | 'fixed';
          discount_value?: number;
          min_order_value?: number | null;
          max_uses?: number | null;
          current_uses?: number;
          start_date?: string | null;
          end_date?: string | null;
          applies_to?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_zones: {
        Row: {
          id: string;
          zone_name: string;
          regions: string[];
          base_charge: number;
          free_delivery_minimum: number;
          estimated_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          zone_name: string;
          regions: string[];
          base_charge: number;
          free_delivery_minimum: number;
          estimated_days: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          zone_name?: string;
          regions?: string[];
          base_charge?: number;
          free_delivery_minimum?: number;
          estimated_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      inventory_movements: {
        Row: {
          id: string;
          product_id: string;
          movement_type: string;
          quantity: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          movement_type: string;
          quantity: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          movement_type?: string;
          quantity?: number;
          notes?: string | null;
          created_at?: string;
        };
      };
      inventory_alerts: {
        Row: {
          id: string;
          product_id: string;
          alert_type: string;
          threshold: number;
          current_quantity: number;
          is_resolved: boolean;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          alert_type: string;
          threshold: number;
          current_quantity: number;
          is_resolved?: boolean;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          alert_type?: string;
          threshold?: number;
          current_quantity?: number;
          is_resolved?: boolean;
          created_at?: string;
          resolved_at?: string | null;
        };
      };
      media_folders: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      media_files: {
        Row: {
          id: string;
          folder_id: string | null;
          name: string;
          url: string;
          file_type: string;
          file_size: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          folder_id?: string | null;
          name: string;
          url: string;
          file_type: string;
          file_size: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          folder_id?: string | null;
          name?: string;
          url?: string;
          file_type?: string;
          file_size?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      seo_pages: {
        Row: {
          id: string;
          page_type: string;
          meta_title: string | null;
          meta_description: string | null;
          meta_keywords: string | null;
          og_title: string | null;
          og_description: string | null;
          og_image: string | null;
          canonical_url: string | null;
          structured_data: any;
          no_index: boolean;
          no_follow: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page_type: string;
          meta_title?: string | null;
          meta_description?: string | null;
          meta_keywords?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          og_image?: string | null;
          canonical_url?: string | null;
          structured_data?: any;
          no_index?: boolean;
          no_follow?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          page_type?: string;
          meta_title?: string | null;
          meta_description?: string | null;
          meta_keywords?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          og_image?: string | null;
          canonical_url?: string | null;
          structured_data?: any;
          no_index?: boolean;
          no_follow?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          details: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: any;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          location: string | null;
          completion_date: string | null;
          is_featured: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          location?: string | null;
          completion_date?: string | null;
          is_featured?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          location?: string | null;
          completion_date?: string | null;
          is_featured?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
