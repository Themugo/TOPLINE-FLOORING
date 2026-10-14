import { supabase } from '@/lib/supabase';
import type { Project, ProjectImage } from '@/lib/types';

/**
 * Public portfolio data is read from the safe `public_projects` view. The base
 * `projects` table is staff-only because it contains internal/customer data.
 * Images are loaded separately because PostgREST embedding across a view is
 * not guaranteed by the deployed relationship metadata.
 */
export type PublicProject = Project & { images: ProjectImage[] };

export async function loadPublicProjects(options: { slug?: string; featured?: boolean } = {}): Promise<PublicProject[]> {
  let query = supabase.from('public_projects').select('*').order('display_order', { ascending: true });
  if (options.slug) query = query.eq('slug', options.slug);
  if (options.featured) query = query.eq('featured', true);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as Array<Omit<Project, 'is_active'>>;
  if (rows.length === 0) return [];

  const projectIds = rows.map((row) => row.id);
  const { data: imageRows, error: imageError } = await supabase
    .from('project_images')
    .select('*')
    .in('project_id', projectIds)
    .order('display_order', { ascending: true });

  // Project copy is still useful if the gallery query fails. Do not turn a
  // secondary image-table issue into a misleading empty portfolio.
  if (imageError) console.warn('Portfolio images could not be loaded; rendering project details without gallery images.', imageError);

  const byProject = new Map<string, ProjectImage[]>();
  ((imageRows ?? []) as ProjectImage[]).forEach((image) => {
    const list = byProject.get(image.project_id) ?? [];
    list.push(image);
    byProject.set(image.project_id, list);
  });

  return rows.map((row) => ({ ...(row as Project), is_active: true, images: byProject.get(row.id) ?? [] }));
}
