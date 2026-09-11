import { supabase } from '@/lib/supabase';

export interface ProductAdminInput {
  name: string; slug: string; categoryId?: string | null; brandId?: string | null;
  description?: string | null; shortDescription?: string | null; sku?: string | null;
  price: number; unit: string; imageUrl?: string | null; featured: boolean; inStock: boolean;
}

const productArgs = (input: ProductAdminInput) => ({
  p_name: input.name, p_slug: input.slug, p_category_id: input.categoryId || null,
  p_brand_id: input.brandId || null, p_description: input.description || null,
  p_short_description: input.shortDescription || null, p_sku: input.sku || null,
  p_price: input.price, p_unit: input.unit, p_image_url: input.imageUrl || null,
  p_featured: input.featured, p_in_stock: input.inStock,
});

export async function createProductAdmin(input: ProductAdminInput) {
  const { data, error } = await supabase.rpc('create_product_admin', productArgs(input));
  if (error) throw error;
  return String(data);
}

export async function updateProductAdmin(id: string, input: ProductAdminInput) {
  const { data, error } = await supabase.rpc('update_product_admin', { p_product_id: id, ...productArgs(input) });
  if (error) throw error;
  return Boolean(data);
}

export async function archiveProductAdmin(id: string) {
  const { data, error } = await supabase.rpc('delete_product_admin', { p_product_id: id });
  if (error) throw error;
  return Boolean(data);
}

export async function resolveInventoryAlert(id: string) {
  const { data, error } = await supabase.rpc('resolve_inventory_alert', { p_alert_id: id });
  if (error) throw error;
  return Boolean(data);
}

export async function setPrimaryProductImage(productId: string, imageId: string) {
  const { data, error } = await supabase.rpc('set_primary_product_image', { p_product_id: productId, p_image_id: imageId });
  if (error) throw error;
  return Boolean(data);
}
