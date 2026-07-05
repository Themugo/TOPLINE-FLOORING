import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
          id: number;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          slug: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: number;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          unit: string | null;
          image_url: string | null;
          category_id: number | null;
          product_type: 'service' | 'material';
          in_stock: boolean;
          featured: boolean;
          created_at: string;
          category_name?: string;
        };
        Insert: {
          id?: number;
          name: string;
          slug: string;
          description?: string | null;
          price: number;
          unit?: string | null;
          image_url?: string | null;
          category_id?: number | null;
          product_type: 'service' | 'material';
          in_stock?: boolean;
          featured?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          unit?: string | null;
          image_url?: string | null;
          category_id?: number | null;
          product_type?: 'service' | 'material';
          in_stock?: boolean;
          featured?: boolean;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: number;
          name: string;
          email: string;
          phone: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          email: string;
          phone: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          email?: string;
          phone?: string;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: number;
          customer_id: number | null;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          total_amount: number;
          status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          customer_id?: number | null;
          customer_name: string;
          customer_phone: string;
          customer_email?: string | null;
          total_amount: number;
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          customer_id?: number | null;
          customer_name?: string;
          customer_phone?: string;
          customer_email?: string | null;
          total_amount?: number;
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: number;
          order_id: number;
          product_id: number;
          quantity: number;
          unit_price: number;
          product_name: string;
        };
        Insert: {
          id?: number;
          order_id: number;
          product_id: number;
          quantity: number;
          unit_price: number;
          product_name: string;
        };
        Update: {
          id?: number;
          order_id?: number;
          product_id?: number;
          quantity?: number;
          unit_price?: number;
          product_name?: string;
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
