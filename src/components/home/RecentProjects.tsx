import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { MapPin, ArrowRight, Building2, Calendar, Ruler, ExternalLink, X, CheckCircle2, Sparkles, Package, Layers, Filter } from 'lucide-react';
import { useProjects } from '@/hooks/use-data';
import { useImagePreloader } from '@/hooks/use-image-preloader';
import { getRandomRealImage, isPlaceholderUrl } from '@/lib/placeholders';
import type { Project, ProjectImage } from '@/lib/types';

interface ProjectWithImages extends Project {
  images?: ProjectImage[];
}

export function RecentProjects() {
  const { projects, loading } = useProjects({ activeOnly: true });
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProject, setSelectedProject] = useState<ProjectWithImages | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Preload featured project thumbnails and modal gallery images
  useImagePreloader(
    useMemo(() => {
      const urls: string[] = [];
      projects.forEach((p) => {
        if (p.image_url) urls.push(p.image_url);
        if (p.images && Array.isArray(p.images)) {
          p.images.forEach((img) => img.image_url && urls.push(img.image_url));
        }
      });
      return urls;
    }, [projects])
  );

  // Build clean category list dynamically including service types
  const categories = useMemo(() => {
    const rawCategories = projects.map((p) => p.category).filter(Boolean) as string[];
    const rawServices = projects.map((p) => p.service_type).filter(Boolean) as string[];

    // Extract normalized key terms like Epoxy, Waterproofing, Polished Concrete, PU Screed
    const normalized = new Set<string>(['All']);
    
    // Add main categories
    rawCategories.forEach((c) => normalized.add(c));

    // Check if key service types exist
    if (rawServices.some((s) => s.toLowerCase().includes('epoxy'))) normalized.add('Epoxy Flooring');
    if (rawServices.some((s) => s.toLowerCase().includes('waterproof'))) normalized.add('Waterproofing');
    if (rawServices.some((s) => s.toLowerCase().includes('polish'))) normalized.add('Concrete Polishing');
    if (rawServices.some((s) => s.toLowerCase().includes('screed') || s.toLowerCase().includes('polyurethane'))) normalized.add('PU Screed');

    return Array.from(normalized);
  }, [projects]);

  // Filter projects dynamically
  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'All') return projects;

    const sel = selectedCategory.toLowerCase();
    return projects.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const service = (p.service_type || '').toLowerCase();
      const title = (p.title || '').toLowerCase();

      if (sel === 'epoxy flooring' || sel === 'epoxy') {
        return cat.includes('epoxy') || service.includes('epoxy') || title.includes('epoxy');
      }
      if (sel === 'waterproofing') {
        return cat.includes('waterproof') || service.includes('waterproof') || title.includes('waterproof');
      }
      if (sel === 'concrete polishing') {
        return cat.includes('polish') || service.includes('polish') || title.includes('polish');
      }
      if (sel === 'pu screed') {
        return cat.includes('screed') || service.includes('screed') || service.includes('polyurethane') || title.includes('screed');
      }

      return p.category === selectedCategory || p.service_type === selectedCategory;
    });
  }, [projects, selectedCategory]);

  // Get primary image helper
  const getPrimaryImage = (project: ProjectWithImages): string => {
    if (project.images && project.images.length > 0) {
      const afterImg = project.images.find((img) => img.image_type === 'after');
      if (afterImg?.image_url && !isPlaceholderUrl(afterImg.image_url)) return afterImg.image_url;
      if (project.images[0]?.image_url && !isPlaceholderUrl(project.images[0].image_url)) return project.images[0].image_url;
    }
    if (project.image_url && !isPlaceholderUrl(project.image_url)) {
      return project.image_url;
    }
    return getRandomRealImage(project.service_type || project.category || project.slug, project.id);
  };

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 text-white relative overflow-hidden">
      {/* Subtle Light Navy Radial Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#4593da_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300 text-xs font-semibold tracking-wider uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-primary-300" />
              <span>Proven Track Record</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Recent Featured Projects
            </h2>
            <p className="text-navy-100 mt-2 text-sm sm:text-base leading-relaxed">
              Explore our recent commercial, industrial, and high-performance flooring installations across East Africa.
            </p>
          </div>

          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-300 hover:text-primary-200 transition-colors group self-start md:self-auto"
          >
            <span>View Full Portfolio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Category Filter Pills Bar */}
        <div className="flex items-center gap-2 mb-10 pb-3 overflow-x-auto border-b border-navy-700/60 scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs text-navy-200 pr-3 font-semibold uppercase tracking-wider flex-shrink-0">
            <Filter className="w-3.5 h-3.5 text-primary-300" /> Filter:
          </div>
          {categories.map((cat) => {
            const count = cat === 'All' ? projects.length : projects.filter((p) => {
              const sel = cat.toLowerCase();
              const c = (p.category || '').toLowerCase();
              const s = (p.service_type || '').toLowerCase();
              const t = (p.title || '').toLowerCase();
              if (sel === 'epoxy flooring' || sel === 'epoxy') return c.includes('epoxy') || s.includes('epoxy') || t.includes('epoxy');
              if (sel === 'waterproofing') return c.includes('waterproof') || s.includes('waterproof') || t.includes('waterproof');
              if (sel === 'concrete polishing') return c.includes('polish') || s.includes('polish') || t.includes('polish');
              if (sel === 'pu screed') return c.includes('screed') || s.includes('screed') || s.includes('polyurethane');
              return p.category === cat || p.service_type === cat;
            }).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
                  selectedCategory === cat
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25 scale-105 font-semibold'
                    : 'bg-navy-950/60 text-navy-200 hover:bg-navy-700 hover:text-white border border-navy-700/60'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-navy-800 text-navy-200'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading State - Skeleton Grid */}
        {loading ? (
          <ProjectsSkeleton />
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-navy-950/40 rounded-2xl border border-navy-700/50">
            <Building2 className="w-12 h-12 text-navy-400 mx-auto mb-3" />
            <p className="text-navy-100 font-semibold text-base mb-1">No projects found in "{selectedCategory}".</p>
            <p className="text-navy-300 text-xs">Try selecting another category filter above or check back soon.</p>
            <button
              onClick={() => setSelectedCategory('All')}
              className="mt-4 px-4 py-2 bg-navy-800 hover:bg-navy-700 text-xs text-primary-300 font-semibold rounded-lg transition-colors"
            >
              Reset Category Filter
            </button>
          </div>
        ) : (
          /* Projects Gallery Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredProjects.map((project) => {
              const mainImage = getPrimaryImage(project);
              return (
                <div
                  key={project.id}
                  onClick={() => {
                    setSelectedProject(project);
                    setActiveImageIndex(0);
                  }}
                  className="group relative bg-navy-950/60 rounded-2xl overflow-hidden border border-navy-700/60 hover:border-primary-400/60 hover:bg-navy-950/80 transition-all duration-500 hover:shadow-2xl hover:shadow-navy-950/50 cursor-pointer flex flex-col"
                >
                  {/* Image Container with Hover Zoom */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-navy-950">
                    <img
                      src={mainImage}
                      alt={project.title}
                      className="w-full h-full object-cover transform transition-transform duration-700 ease-out group-hover:scale-110"
                      loading="lazy"
                    />
                    
                    {/* Dark Navy Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/20 to-transparent opacity-80 group-hover:opacity-70 transition-opacity" />

                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-10">
                      <span className="px-3 py-1 bg-navy-900/90 backdrop-blur-md text-primary-300 text-xs font-semibold rounded-full border border-navy-700/80">
                        {project.service_type || project.category || 'Flooring'}
                      </span>
                      {project.featured && (
                        <span className="px-2.5 py-0.5 bg-primary-500/90 text-white text-[11px] font-bold uppercase tracking-wider rounded-md shadow-sm">
                          Featured
                        </span>
                      )}
                    </div>

                    {/* Quick Location & Area Badge at Bottom of Image */}
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-navy-100 z-10">
                      {project.location && (
                        <span className="inline-flex items-center gap-1 bg-navy-950/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-navy-800/80">
                          <MapPin className="w-3.5 h-3.5 text-primary-400" />
                          {project.location}
                        </span>
                      )}
                      {project.area_size && (
                        <span className="inline-flex items-center gap-1 bg-navy-950/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-navy-800/80">
                          <Ruler className="w-3.5 h-3.5 text-primary-400" />
                          {project.area_size}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-display font-bold text-lg text-white group-hover:text-primary-300 transition-colors line-clamp-1 mb-2">
                        {project.title}
                      </h3>
                      {project.description && (
                        <p className="text-navy-200/90 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-4">
                          {project.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom CTA trigger inside card */}
                    <div className="pt-3 border-t border-navy-800/80 flex items-center justify-between text-xs font-semibold text-primary-300 group-hover:text-primary-200">
                      <span className="inline-flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Full Specifications
                      </span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Callout Bar */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-navy-950/90 via-navy-800/80 to-navy-950/90 border border-navy-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-300 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm sm:text-base">Have a specialized flooring or waterproofing project?</h4>
              <p className="text-navy-200 text-xs sm:text-sm">Our technical engineers provide on-site inspections and tailored material specifications.</p>
            </div>
          </div>
          <Link
            href="/quotation"
            className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium text-xs sm:text-sm transition-all shadow-lg shadow-primary-500/20 whitespace-nowrap self-stretch sm:self-auto text-center"
          >
            Get Free Consultation
          </Link>
        </div>
      </div>

      {/* Interactive Project Detail Lightbox Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl text-white relative">
            {/* Modal Header Bar / Close button */}
            <button
              onClick={() => setSelectedProject(null)}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-gray-800/80 hover:bg-primary-500 text-white transition-colors"
              aria-label="Close project modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main Modal Image Stage */}
            <div className="relative aspect-video bg-black overflow-hidden">
              {selectedProject.images && selectedProject.images.length > 0 ? (
                <>
                  <img
                    src={selectedProject.images[activeImageIndex]?.image_url || getPrimaryImage(selectedProject)}
                    alt={selectedProject.title}
                    className="w-full h-full object-cover transition-opacity duration-300"
                  />
                  {selectedProject.images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-black/70 px-3 py-1.5 rounded-full backdrop-blur-md border border-gray-700/50">
                      {selectedProject.images.map((img, idx) => (
                        <button
                          key={img.id || idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase transition-all ${
                            idx === activeImageIndex
                              ? 'bg-primary-500 text-white shadow'
                              : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {img.image_type || `PHOTO ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={getPrimaryImage(selectedProject)}
                  alt={selectedProject.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Modal Text Details */}
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-xs font-semibold uppercase tracking-wider border border-primary-500/30">
                  {selectedProject.service_type || selectedProject.category}
                </span>
                {selectedProject.category && (
                  <span className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-xs font-medium">
                    {selectedProject.category}
                  </span>
                )}
                {selectedProject.client_name && (
                  <span className="px-3 py-1 rounded-full bg-gray-800/60 text-gray-400 text-xs font-medium">
                    Client: {selectedProject.client_name}
                  </span>
                )}
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">
                {selectedProject.title}
              </h2>

              {/* Metadata Highlights Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-800/60 border border-gray-800 text-xs sm:text-sm text-gray-300 mb-6">
                {selectedProject.location && (
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-primary-500/10 text-primary-400 rounded-lg">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-500 uppercase font-semibold">Location</span>
                      <span className="font-medium text-white">{selectedProject.location}</span>
                    </div>
                  </div>
                )}
                {selectedProject.area_size && (
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-primary-500/10 text-primary-400 rounded-lg">
                      <Ruler className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-500 uppercase font-semibold">Area Cover</span>
                      <span className="font-medium text-white">{selectedProject.area_size}</span>
                    </div>
                  </div>
                )}
                {selectedProject.completion_date && (
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-primary-500/10 text-primary-400 rounded-lg">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-500 uppercase font-semibold">Completion Date</span>
                      <span className="font-medium text-white">{selectedProject.completion_date}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Materials Used Specification Box */}
              {(selectedProject.materials_used || selectedProject.service_type) && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-gray-800/80 to-gray-800/40 border border-gray-700/60 mb-6">
                  <div className="flex items-center gap-2 mb-2 text-primary-400 font-bold text-xs uppercase tracking-wider">
                    <Package className="w-4 h-4 text-primary-400" />
                    <span>Materials Used & System Specification</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-mono bg-gray-900/80 p-3 rounded-lg border border-gray-800">
                    {selectedProject.materials_used || `${selectedProject.service_type} High-Grade Industrial System`}
                  </p>
                </div>
              )}

              {/* Detailed Description */}
              {selectedProject.description && (
                <div className="mb-6">
                  <h4 className="font-semibold text-xs text-gray-400 uppercase tracking-wider mb-2">Project Overview</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {selectedProject.description}
                  </p>
                </div>
              )}

              {/* Challenge / Solution / Results Grid */}
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {selectedProject.challenge && (
                  <div className="p-4 rounded-xl bg-gray-800/40 border border-gray-800">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-red-400 mb-1.5 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" /> Challenge
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed">{selectedProject.challenge}</p>
                  </div>
                )}
                {selectedProject.solution && (
                  <div className="p-4 rounded-xl bg-gray-800/40 border border-gray-800">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-primary-400 mb-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Our Solution
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed">{selectedProject.solution}</p>
                  </div>
                )}
                {selectedProject.results && (
                  <div className="p-4 rounded-xl bg-gray-800/40 border border-gray-800">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Result & Impact
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed">{selectedProject.results}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-800">
                <Link
                  href="/quotation"
                  className="flex-1 py-3 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm text-center transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
                >
                  <span>Request Similar Project Quote</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="py-3 px-6 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Skeleton loading component for RecentProjects
function ProjectsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-gray-800/60 rounded-2xl overflow-hidden border border-gray-800 animate-pulse flex flex-col"
        >
          {/* Skeleton Image Stage */}
          <div className="aspect-[16/10] bg-gray-700/60 relative p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="h-6 w-24 bg-gray-600/70 rounded-full" />
              <div className="h-5 w-16 bg-gray-600/70 rounded-md" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-5 w-28 bg-gray-600/50 rounded-md" />
              <div className="h-5 w-20 bg-gray-600/50 rounded-md" />
            </div>
          </div>

          {/* Skeleton Content */}
          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="h-5 bg-gray-700/80 rounded-md w-3/4" />
              <div className="h-3.5 bg-gray-700/50 rounded-md w-full" />
              <div className="h-3.5 bg-gray-700/50 rounded-md w-2/3" />
            </div>

            <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
              <div className="h-4 w-32 bg-gray-700/60 rounded-md" />
              <div className="h-4 w-4 bg-gray-700/60 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
