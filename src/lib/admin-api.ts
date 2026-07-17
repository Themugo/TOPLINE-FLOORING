/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

// ============== ACTIVITY LOGGING ==============

export async function logAdminAction(action: string, entityType?: string, entityId?: string, details?: Record<string, any>) {
  try {
    await supabase.from('activity_logs').insert({
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: details || {},
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch {
    // Silently fail
  }
}

// Hero Slides
export function useListHeroSlides() {
  return useQuery({
    queryKey: ['heroSlides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_slides')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateHeroSlide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('hero_slides')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['heroSlides'] });
      logAdminAction('create_hero_slide', 'hero_slides', result?.id, { title: result?.title });
    },
  });
}

export function useUpdateHeroSlide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase
        .from('hero_slides')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['heroSlides'] });
      logAdminAction('update_hero_slide', 'hero_slides', result?.id, { title: result?.title });
    },
  });
}

export function useDeleteHeroSlide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hero_slides').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['heroSlides'] });
      logAdminAction('delete_hero_slide', 'hero_slides', String(id));
    },
  });
}

// Testimonials
export function useListTestimonials() {
  return useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('testimonials')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      logAdminAction('create_testimonial', 'testimonials', result?.id, { name: result?.name });
    },
  });
}

export function useUpdateTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase
        .from('testimonials')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      logAdminAction('update_testimonial', 'testimonials', result?.id, { name: result?.name });
    },
  });
}

export function useDeleteTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      logAdminAction('delete_testimonial', 'testimonials', String(id));
    },
  });
}

// Partners
export function useListPartners() {
  return useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('partners')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      logAdminAction('create_partner', 'partners', result?.id, { name: result?.name });
    },
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase
        .from('partners')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      logAdminAction('update_partner', 'partners', result?.id, { name: result?.name });
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('partners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      logAdminAction('delete_partner', 'partners', String(id));
    },
  });
}

// Quotations
export function useListQuotations(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['quotations', filters],
    queryFn: async () => {
      let query = supabase
        .from('quotations')
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

export function useGetQuotation(id: string) {
  return useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase
        .from('quotations')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation'] });
      logAdminAction('update_quotation', 'quotations', result?.id, { status: result?.status });
    },
  });
}

// Site Settings
export function useListSettings() {
  return useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');
      if (error) throw error;
      const settings: Record<string, string> = {};
      (data || []).forEach((s: any) => {
        settings[s.setting_key] = s.setting_value || '';
      });
      return settings;
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      logAdminAction('update_setting', 'site_settings', vars.key);
    },
  });
}

export function useUpdateMultipleSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('site_settings')
        .upsert(updates);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      logAdminAction('update_multiple_settings', 'site_settings');
    },
  });
}
