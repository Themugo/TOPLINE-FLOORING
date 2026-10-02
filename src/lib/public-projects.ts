import { supabase } from '@/lib/supabase';
import type { Project, ProjectImage } from '@/lib/types';

/**
 * Public portfolio data comes from the `public_projects` view (active projects, safe columns
 * only). The base `projects` table is staff-only because it holds customer links and cost data.
 * Images are loaded separately so the page never depends on PostgREST embedding across a view.
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

  const { data: imageRows, error: imageError } = await supabase
    .from('project_images')
    .select('*')
    .in('project_id', rows.map((r) => r.id))
    .order('display_order', { ascending: true });
  if (imageError) throw imageError;

  const byProject = new Map<string, ProjectImage[]>();
  ((imageRows ?? []) as ProjectImage[]).forEach((img) => {
    const list = byProject.get(img.project_id) ?? [];
    list.push(img);
    byProject.set(img.project_id, list);
  });

  return rows.map((row) => ({ ...(row as Project), is_active: true, images: byProject.get(row.id) ?? [] }));
}
