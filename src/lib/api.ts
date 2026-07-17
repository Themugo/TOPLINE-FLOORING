/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Tables<T extends string> = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type TablesInsert<T extends string> = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type TablesUpdate<T extends string> = Record<string, any>;

// Product types
export type Product = Tables<'products'> & { category_name?: string };
export type ProductInsert = TablesInsert<'products'>;
export type ProductUpdate = TablesUpdate<'products'>;

// Category types
export type Category = Tables<'categories'>;
export type CategoryInsert = TablesInsert<'categories'>;
export type CategoryUpdate = TablesUpdate<'categories'>;

// Order types
export type Order = Tables<'orders'>;
export type OrderInsert = TablesInsert<'orders'>;
export type OrderUpdate = TablesUpdate<'orders'>;

// Order item types
export type OrderItem = Tables<'order_items'>;
export type OrderItemInsert = TablesInsert<'order_items'>;

// Customer types
export type Customer = Tables<'customers'>;
export type CustomerInsert = TablesInsert<'customers'>;
export type CustomerUpdate = TablesUpdate<'customers'>;

// Dashboard stats type
export type DashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
};

// Order with items
export type OrderWithItems = Order & { items: OrderItem[] };

// ============== PRODUCTS ==============

export function useListProducts(filters?: {
  categoryId?: string;
  search?: string;
  featured?: boolean;
}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from('products')
        .select('*, categories!left(name)')
        .order('created_at', { ascending: false });

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.featured) {
        query = query.eq('featured', true);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        category_name: p.categories?.name || null,
      }));
    },
  });
}

export function useGetProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async (): Promise<Product | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('products')
        .select('*, categories!left(name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return {
        ...data,
        category_name: data.categories?.name || null,
      } as Product;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProductInsert) => {
      const { data: result, error } = await supabase
        .from('products')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductUpdate }) => {
      const { data: result, error } = await supabase
        .from('products')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ============== CATEGORIES ==============

export function useListCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CategoryInsert) => {
      const { data: result, error } = await supabase
        .from('categories')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryUpdate }) => {
      const { data: result, error } = await supabase
        .from('categories')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ============== ORDERS ==============

export function useListOrders(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async (): Promise<Order[]> => {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useGetOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async (): Promise<OrderWithItems | null> => {
      if (!id) return null;
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);
      if (itemsError) throw itemsError;

      return { ...order, items: items || [] };
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      order,
      items,
    }: {
      order: OrderInsert;
      items: Omit<OrderItemInsert, 'order_id'>[];
    }) => {
      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();
      if (error) throw error;

      const orderItems = items.map((item) => ({
        ...item,
        order_id: newOrder.id,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      if (itemsError) throw itemsError;

      return newOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: OrderUpdate }) => {
      const { data: result, error } = await supabase
        .from('orders')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });
}

// ============== CUSTOMERS ==============

export function useListCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CustomerInsert) => {
      const { data: result, error } = await supabase
        .from('customers')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ============== ADMIN ==============
// Authentication is handled exclusively via Supabase Auth (JWT).
// See useAdminAuth() in hooks/use-data.ts for the single source of truth.

// ============== DASHBOARD STATS ==============

export function useGetDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [ordersResult, productsResult, customersResult] = await Promise.all([
        supabase.from('orders').select('status, total_amount'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
      ]);

      const orders = ordersResult.data || [];
      const totalOrders = orders.length;
      const pendingOrders = orders.filter((o) => o.status === 'pending').length;
      const completedOrders = orders.filter((o) => o.status === 'completed').length;
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      return {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue,
        totalProducts: productsResult.count || 0,
        totalCustomers: customersResult.count || 0,
      };
    },
  });
}

export function useGetRecentOrders() {
  return useQuery({
    queryKey: ['recentOrders'],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useGetOrdersByStatus() {
  return useQuery({
    queryKey: ['ordersByStatus'],
    queryFn: async (): Promise<{ status: string; count: number }[]> => {
      const { data, error } = await supabase.from('orders').select('status');
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((o) => {
        counts[o.status] = (counts[o.status] || 0) + 1;
      });

      return Object.entries(counts).map(([status, count]) => ({ status, count }));
    },
  });
}

// Query keys for invalidation
export const getListProductsQueryKey = (filters?: Parameters<typeof useListProducts>[0]) => ['products', filters];
export const getGetProductQueryKey = (id: string) => ['product', id];
export const getListOrdersQueryKey = () => ['orders'];
export const getGetDashboardStatsQueryKey = () => ['dashboardStats'];
export const getGetRecentOrdersQueryKey = () => ['recentOrders'];
export const getGetOrdersByStatusQueryKey = () => ['ordersByStatus'];
