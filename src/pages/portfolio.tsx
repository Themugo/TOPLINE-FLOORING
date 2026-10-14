import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Award, Building2, Calendar, CheckCircle2, ChevronLeft, ChevronRight,
  ImageOff, Layers, Loader2, MapPin, RotateCw, Search, ShieldAlert, Sparkles,
  Wrench, X,
} from 'lucide-react';
import { Link } from 'wouter';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useSeoMeta } from '@/hooks/use-seo';
import { loadPublicProjects } from '@/lib/public-projects';
import type { Project, ProjectImage } from '@/lib/types';

interface ProjectWithImages extends Project {
  images: ProjectImage[];
}

type GalleryImage = { url: string; type?: string; caption?: string };

function ProjectImageFallback({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-navy-900 via-navy-800 to-slate-700 text-white/70 ${className}`} aria-label="Project image not available">
      <ImageOff className="h-8 w-8" aria-hidden="true" />
      <span className="text-xs font-medium">Project image unavailable</span>
    </div>
  );
}

function ProjectPhoto({ src, alt, className = '', loading = 'lazy' }: { src?: string | null; alt: string; className?: string; loading?: 'eager' | 'lazy' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <ProjectImageFallback className={className} />;
  return <img src={src} alt={alt} loading={loading} className={className} onError={() => setFailed(true)} />;
}

export default function Portfolio() {
  useSeoMeta('portfolio', null, { breadcrumbs: [{ label: 'Portfolio' }] });
  const [projects, setProjects] = useState<ProjectWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectWithImages | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const rows = await loadPublicProjects();
      setProjects(rows);
    } catch (err) {
      console.error('Portfolio project query failed.', err);
      setProjects([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: projects.length };
    projects.forEach((project) => {
      const category = (project.category || project.service_type || '').trim();
      if (category) counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }, [projects]);

  const categories = useMemo(() => ['All', ...Object.keys(categoryCounts).filter((category) => category !== 'All').sort((a, b) => a.localeCompare(b))], [categoryCounts]);

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();
    return projects.filter((project) => {
      const matchesCategory = selectedCategory === 'All' || project.category === selectedCategory || project.service_type === selectedCategory;
      const searchable = [project.title, project.description, project.summary, project.category, project.service_type, project.location, project.materials_used]
        .filter(Boolean).join(' ').toLocaleLowerCase();
      return matchesCategory && (!term || searchable.includes(term));
    });
  }, [projects, searchTerm, selectedCategory]);

  const projectImages = (project: ProjectWithImages): GalleryImage[] => {
    const images = (project.images || [])
      .filter((image) => Boolean(image.image_url))
      .map((image) => ({ url: image.image_url, type: image.image_type, caption: image.caption || undefined }));
    if (images.length) return images;
    return project.image_url ? [{ url: project.image_url, caption: project.title }] : [];
  };

  const primaryImage = (project: ProjectWithImages) => {
    const images = projectImages(project);
    return images.find((image) => image.type === 'after')?.url || images[0]?.url || null;
  };

  const closeProject = useCallback(() => setSelectedProject(null), []);
  const selectedImageCount = selectedProject ? projectImages(selectedProject).length : 0;
  useEffect(() => {
    if (!selectedProject) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeProject();
      if (event.key === 'ArrowRight') setCurrentImageIndex((index) => {
        const length = selectedImageCount;
        return length > 0 ? (index + 1) % length : 0;
      });
      if (event.key === 'ArrowLeft') setCurrentImageIndex((index) => {
        const length = selectedImageCount;
        return length > 0 ? (index - 1 + length) % length : 0;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedProject, selectedImageCount, closeProject]);

  const openProject = (project: ProjectWithImages) => {
    setSelectedProject(project);
    setCurrentImageIndex(0);
  };

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: 'Portfolio' }]} />

      <section className="relative overflow-hidden border-b border-gray-200/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/70 py-12 sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary-100/50 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white/90 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-700 shadow-sm">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" /> Project portfolio
          </span>
          <h1 className="mx-auto max-w-4xl font-display text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl lg:text-5xl">Work delivered. Surfaces engineered.</h1>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-navy-600 sm:text-lg">
            Explore published flooring and waterproofing projects, the systems applied, and the challenges each project was designed to solve.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-semibold text-navy-700 sm:text-sm">
            <span className="inline-flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary-600" aria-hidden="true" /> Project details published by our team</span>
            <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-primary-600" aria-hidden="true" /> Commercial, industrial and residential work</span>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">Project library</p>
            <p className="mt-1 text-sm text-gray-600">{loading ? 'Loading published projects…' : loadError ? 'Project data could not be loaded.' : `${filteredProjects.length} ${filteredProjects.length === 1 ? 'project' : 'projects'} shown`}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <label className="relative block min-w-0 flex-1 sm:min-w-[270px] lg:w-[320px] lg:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search projects, services or locations" aria-label="Search portfolio projects"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 text-sm text-navy-950 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
              />
            </label>
            {!loading && !loadError && categories.length > 1 && (
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm text-navy-800">
                <span className="whitespace-nowrap text-xs font-semibold text-gray-500">Category</span>
                <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} aria-label="Filter projects by category" className="min-w-0 max-w-[220px] bg-transparent py-3 font-semibold outline-none">
                  {categories.map((category) => <option key={category} value={category}>{category} ({categoryCounts[category] || 0})</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
        {!loading && !loadError && categories.length > 2 && (
          <div className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto px-4 pb-1 sm:px-6 lg:px-8" aria-label="Quick category filters">
            {categories.map((category) => (
              <button key={category} type="button" onClick={() => setSelectedCategory(category)} aria-pressed={selectedCategory === category}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition ${selectedCategory === category ? 'border-primary-600 bg-primary-600 text-white shadow-sm' : 'border-gray-200 bg-white text-navy-700 hover:border-primary-300 hover:bg-primary-50'}`}>
                {category}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${selectedCategory === category ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{categoryCounts[category] || 0}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="bg-slate-50/80 py-10 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center py-16 text-center" role="status" aria-live="polite">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
              <p className="text-sm font-semibold text-navy-800">Loading published case studies</p>
              <p className="mt-1 text-xs text-gray-500">This may take a moment.</p>
            </div>
          ) : loadError ? (
            <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white px-6 py-10 text-center shadow-sm">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-amber-600" aria-hidden="true" />
              <h2 className="font-display text-xl font-bold text-navy-950">We couldn’t load the portfolio</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">The project service did not return data. Please retry in a moment or contact our team to discuss a similar project.</p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <button type="button" onClick={() => void fetchProjects()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-700"><RotateCw className="h-4 w-4" aria-hidden="true" /> Retry loading</button>
                <Link href="/contact" className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-navy-800 transition hover:bg-gray-50">Contact our team</Link>
              </div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center sm:px-10">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-300" aria-hidden="true" />
              <h2 className="font-display text-xl font-bold text-navy-950">{projects.length === 0 ? 'Project case studies are being updated' : 'No matching projects found'}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-gray-600">{projects.length === 0 ? 'There are no public case studies available to display right now. Our team can still help scope a flooring or waterproofing project for your site.' : 'Try another category or search term, or clear the filters to browse all published projects.'}</p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                {(selectedCategory !== 'All' || searchTerm) && <button type="button" onClick={() => { setSelectedCategory('All'); setSearchTerm(''); }} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-navy-800 transition hover:bg-gray-50">Clear filters</button>}
                <Link href="/quotation" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-700">Request a project proposal <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
              {filteredProjects.map((project) => (
                <article key={project.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl">
                  <button type="button" onClick={() => openProject(project)} aria-label={`View project details: ${project.title}`} className="relative block w-full overflow-hidden text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary-300">
                    <div className="relative aspect-[4/3] overflow-hidden bg-navy-900">
                      <ProjectPhoto src={primaryImage(project)} alt={project.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/10 to-transparent" />
                      {project.featured && <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"><Sparkles className="h-3 w-3" aria-hidden="true" /> Featured</span>}
                      {project.area_size && <span className="absolute right-3 top-3 rounded-lg border border-white/20 bg-navy-950/75 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur">{project.area_size}</span>}
                      <span className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-white">
                        <span className="min-w-0 truncate text-xs font-medium">{project.location ? <><MapPin className="mr-1 inline h-3.5 w-3.5 text-primary-300" aria-hidden="true" />{project.location}</> : 'Project location not published'}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary-200">View case <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" aria-hidden="true" /></span>
                      </span>
                    </div>
                  </button>
                  <div className="flex flex-1 flex-col p-5">
                    {(project.service_type || project.category) && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-primary-700">{project.service_type || project.category}</p>}
                    <h2 className="font-display text-lg font-bold leading-snug text-navy-950 transition group-hover:text-primary-700">{project.title}</h2>
                    {(project.summary || project.description) && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">{project.summary || project.description}</p>}
                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4 mt-5 text-xs text-gray-500">
                      {project.client_name && <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold text-navy-700"><Building2 className="h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden="true" />{project.client_name}</span>}
                      {project.completion_date && <span className="ml-auto inline-flex shrink-0 items-center gap-1.5"><Calendar className="h-3.5 w-3.5" aria-hidden="true" />{new Date(project.completion_date).getFullYear()}</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 py-14 text-white sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-primary-300" aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-200">Your site. Your specification.</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Planning a similar flooring or waterproofing project?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">Tell us about your facility, surface condition and performance requirements. Our team can help you identify the right next step and prepare a project-specific proposal.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/quotation" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:bg-primary-500">Request project proposal <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="/contact" className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">Contact our team</Link>
          </div>
        </div>
      </section>

      {selectedProject && (() => {
        const images = projectImages(selectedProject);
        const activeImage = images[currentImageIndex];
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/80 p-2 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closeProject(); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="portfolio-dialog-title" className="flex max-h-[95dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl sm:rounded-3xl">
              <header className="flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  {(selectedProject.service_type || selectedProject.category) && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-700">{selectedProject.service_type || selectedProject.category}</p>}
                  <h2 id="portfolio-dialog-title" className="font-display text-lg font-bold leading-snug text-navy-950 sm:text-2xl">{selectedProject.title}</h2>
                </div>
                <button type="button" onClick={closeProject} aria-label="Close project details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-navy-800 transition hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"><X className="h-5 w-5" aria-hidden="true" /></button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="relative aspect-video max-h-[55vh] bg-navy-950">
                  {activeImage ? <ProjectPhoto src={activeImage.url} alt={activeImage.caption || selectedProject.title} loading="eager" className="h-full w-full object-contain" /> : <ProjectImageFallback />}
                  {images.length > 1 && <>
                    <button type="button" onClick={() => setCurrentImageIndex((index) => (index - 1 + images.length) % images.length)} aria-label="Previous project image" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-navy-950/80 text-white shadow-lg transition hover:bg-navy-900"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
                    <button type="button" onClick={() => setCurrentImageIndex((index) => (index + 1) % images.length)} aria-label="Next project image" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-navy-950/80 text-white shadow-lg transition hover:bg-navy-900"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
                  </>}
                  {activeImage && <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-xs text-white"><span className="rounded-lg bg-navy-950/80 px-2.5 py-1.5 font-semibold">{activeImage.type ? activeImage.type.replace(/_/g, ' ') : `Image ${currentImageIndex + 1} of ${images.length}`}</span>{activeImage.caption && <span className="max-w-[65%] truncate rounded-lg bg-navy-950/75 px-2.5 py-1.5">{activeImage.caption}</span>}</div>}
                </div>
                {images.length > 1 && <div className="flex gap-2 overflow-x-auto border-b border-gray-800 bg-navy-950 px-4 py-3" aria-label="Project image thumbnails">{images.map((image, index) => <button key={`${image.url}-${index}`} type="button" onClick={() => setCurrentImageIndex(index)} aria-label={`Show image ${index + 1}`} aria-pressed={index === currentImageIndex} className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${index === currentImageIndex ? 'border-primary-400 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}><ProjectPhoto src={image.url} alt="" className="h-full w-full object-cover" /></button>)}</div>}
                <div className="space-y-6 p-4 sm:p-7">
                  <div className="grid gap-3 rounded-2xl border border-gray-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    {selectedProject.location && <div><span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Location</span><span className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-navy-950"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />{selectedProject.location}</span></div>}
                    {selectedProject.client_name && <div><span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Client</span><span className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-navy-950"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />{selectedProject.client_name}</span></div>}
                    {selectedProject.area_size && <div><span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Project area / scope</span><span className="mt-1 text-sm font-semibold text-navy-950">{selectedProject.area_size}</span></div>}
                    {selectedProject.completion_date && <div><span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Completion</span><span className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-navy-950"><Calendar className="h-4 w-4 text-primary-600" aria-hidden="true" />{new Date(selectedProject.completion_date).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}</span></div>}
                  </div>
                  {(selectedProject.summary || selectedProject.description) && <div><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-900">Project overview</h3><p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{selectedProject.summary || selectedProject.description}</p></div>}
                  <div className="grid gap-4 md:grid-cols-3">
                    {selectedProject.challenge && <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4"><h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-950"><ShieldAlert className="h-4 w-4" aria-hidden="true" />Challenge</h3><p className="whitespace-pre-line text-sm leading-relaxed text-amber-950/90">{selectedProject.challenge}</p></div>}
                    {selectedProject.solution && <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4"><h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-950"><Wrench className="h-4 w-4" aria-hidden="true" />Solution applied</h3><p className="whitespace-pre-line text-sm leading-relaxed text-blue-950/90">{selectedProject.solution}</p></div>}
                    {selectedProject.results && <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4"><h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-950"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Outcome</h3><p className="whitespace-pre-line text-sm leading-relaxed text-emerald-950/90">{selectedProject.results}</p></div>}
                  </div>
                  {selectedProject.materials_used && <div className="rounded-xl border border-gray-200 bg-white p-4"><h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-900"><Award className="h-4 w-4 text-primary-600" aria-hidden="true" />Materials and system</h3><p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{selectedProject.materials_used}</p></div>}
                  <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-relaxed text-gray-500">Project scope and warranty terms are confirmed in the project-specific quotation.</p><Link href="/quotation" onClick={closeProject} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-700">Discuss a similar project <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
                </div>
              </div>
            </section>
          </div>
        );
      })()}
    </CustomerLayout>
  );
}
