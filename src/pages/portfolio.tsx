import { useState, useEffect, useMemo } from 'react';
import { X, MapPin, Building2, Calendar, Ruler, Loader2, CheckCircle2, ShieldCheck, Award, Sparkles, Layers, ChevronLeft, ChevronRight, ArrowRight, Wrench, ShieldAlert } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useSeoMeta } from '@/hooks/use-seo';
import { Link } from 'wouter';
import { supabase } from '@/lib/supabase';
import { useImagePreloader } from '@/hooks/use-image-preloader';
import { MOCK_PROJECTS } from '@/lib/mock-data';
import type { Project, ProjectImage } from '@/lib/types';

interface ProjectWithImages extends Project {
  images: ProjectImage[];
}

const DEFAULT_PROJECT_IMAGE = 'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=1200&q=80';

export default function Portfolio() {
  useSeoMeta('portfolio', null, { breadcrumbs: [{ label: 'Portfolio' }] });
  const [projects, setProjects] = useState<ProjectWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState<ProjectWithImages | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Preload image assets
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

  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, images:project_images(*)')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('display_order', { foreignTable: 'project_images', ascending: true });

        if (!error && data && data.length > 0) {
          setProjects(data as ProjectWithImages[]);
        } else {
          // Fallback to rich mock projects if DB has no entries or on connection issues
          setProjects(MOCK_PROJECTS as unknown as ProjectWithImages[]);
        }
      } catch (err) {
        console.warn('Using mock projects fallback:', err);
        setProjects(MOCK_PROJECTS as unknown as ProjectWithImages[]);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: projects.length };
    projects.forEach(p => {
      const cat = p.category || p.service_type || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [projects]);

  const categories = useMemo(() => {
    return ['All', ...Object.keys(categoryCounts).filter(c => c !== 'All')];
  }, [categoryCounts]);

  const filteredProjects = selectedCategory === 'All'
    ? projects
    : projects.filter(p => p.category === selectedCategory || p.service_type === selectedCategory);

  const getPrimaryImage = (project: ProjectWithImages) => {
    const afterImage = project.images?.find(img => img.image_type === 'after');
    const firstImg = project.images?.[0];
    return afterImage?.image_url || firstImg?.image_url || project.image_url || DEFAULT_PROJECT_IMAGE;
  };

  const getProjectImagesList = (project: ProjectWithImages): { url: string; type?: string; caption?: string }[] => {
    if (project.images && project.images.length > 0) {
      return project.images.map(img => ({
        url: img.image_url || DEFAULT_PROJECT_IMAGE,
        type: img.image_type,
        caption: img.caption || undefined
      }));
    }
    return [{ url: project.image_url || DEFAULT_PROJECT_IMAGE, caption: project.title }];
  };

  return (
    <CustomerLayout>
      <Breadcrumbs items={[{ label: 'Portfolio' }]} />
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-gray-50 via-white to-gray-50 border-b border-gray-200/80 py-16 lg:py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-block px-3.5 py-1 rounded-full bg-primary-50 text-primary-600 border border-primary-100 text-xs font-semibold uppercase tracking-wider mb-3">
            Case Studies & Proven Deliverables
          </span>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-950 tracking-tight mb-4">
            Our Engineering Portfolio
          </h1>
          <p className="text-navy-600 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            Explore completed industrial flooring, polyurethane screeds, rooftop waterproofing, and polished concrete projects engineered to the highest industry standards.
          </p>

          {/* Quick Metrics */}
          <div className="mt-8 flex flex-wrap justify-center items-center gap-6 sm:gap-10 text-xs sm:text-sm font-semibold text-navy-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-500" />
              <span>100% Quality Audited</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-primary-500" />
              <span>Written 10-Yr Warranty</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span>50,000+ m² Installed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category Navigation Tabs */}
      {categories.length > 1 && (
        <section className="py-4 bg-white/90 backdrop-blur-md border-b border-gray-200/80 sticky top-16 lg:top-20 z-30 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none justify-start sm:justify-center">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                    selectedCategory === cat
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                      : 'bg-gray-100/80 text-navy-700 hover:bg-gray-200/80'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    selectedCategory === cat ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {categoryCounts[cat] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Projects Grid */}
      <section className="py-12 lg:py-16 bg-gray-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm font-medium">Loading project case studies...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 max-w-md mx-auto">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-display font-bold text-navy-950 mb-1">No Projects in this Category</h3>
              <p className="text-gray-500 text-xs">Try selecting another filter or browse all case studies.</p>
              <button
                onClick={() => setSelectedCategory('All')}
                className="mt-4 px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 text-xs font-bold rounded-lg transition-colors"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => {
                    setSelectedProject(project);
                    setCurrentImageIndex(0);
                  }}
                  className="group bg-white rounded-2xl border border-gray-200/80 hover:border-primary-300 shadow-2xs hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Image Container */}
                    <div className="aspect-[4/3] overflow-hidden relative bg-navy-950">
                      <img
                        src={getPrimaryImage(project)}
                        alt={project.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_PROJECT_IMAGE;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                      
                      {project.featured && (
                        <span className="absolute top-3.5 left-3.5 px-2.5 py-1 bg-primary-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-xs flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Featured Case
                        </span>
                      )}

                      <span className="absolute top-3.5 right-3.5 px-2.5 py-1 bg-navy-950/70 backdrop-blur-xs text-gray-200 text-[10px] font-semibold rounded-md border border-white/10">
                        {project.area_size || 'Commercial Spec'}
                      </span>

                      <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white text-xs font-medium">
                        <span className="inline-flex items-center gap-1 text-gray-200 text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-primary-400" />
                          {project.location || 'Metropolitan Area'}
                        </span>
                        <span className="text-[11px] font-semibold text-primary-300 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                          View Details <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <p className="text-[11px] font-bold text-primary-600 uppercase tracking-wider mb-1.5">
                        {project.service_type || project.category || 'Specialized Application'}
                      </p>
                      <h3 className="font-display font-bold text-navy-950 text-base lg:text-lg group-hover:text-primary-600 transition-colors line-clamp-2 leading-snug mb-2">
                        {project.title}
                      </h3>
                      {project.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-3">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3.5 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                    <span className="text-navy-800 font-semibold truncate max-w-[60%]">
                      {project.client_name || 'Commercial Client'}
                    </span>
                    {project.completion_date && (
                      <span className="inline-flex items-center gap-1 text-gray-400 text-[11px]">
                        <Calendar className="w-3 h-3" />
                        {new Date(project.completion_date).getFullYear()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <Building2 className="w-10 h-10 text-primary-400 mx-auto mb-4" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Require Similar High-Spec Flooring?
          </h2>
          <p className="text-navy-100/90 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            Our engineering team conducts detailed surface profiling, moisture diagnostics, and custom system proposals for industrial facilities across East Africa.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/quotation" className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-500/25 transition-all">
              Request Project Proposal
            </Link>
            <Link href="/contact" className="w-full sm:w-auto bg-navy-800/80 hover:bg-navy-800 border border-navy-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all">
              Contact Engineering Team
            </Link>
          </div>
        </div>
      </section>

      {/* Detailed Case Study Modal */}
      {selectedProject && (() => {
        const imageList = getProjectImagesList(selectedProject);
        const activeImg = imageList[currentImageIndex] || imageList[0];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-navy-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
              
              {/* Modal Top Header */}
              <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-20">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2.5 py-1 rounded-md border border-primary-100">
                    {selectedProject.service_type || selectedProject.category}
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-navy-950 mt-1.5 leading-snug">
                    {selectedProject.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-navy-800 flex items-center justify-center transition-colors flex-shrink-0 ml-4"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Gallery Viewport */}
              <div className="relative aspect-video bg-navy-950 overflow-hidden flex-shrink-0 group">
                <img
                  src={activeImg.url}
                  alt={selectedProject.title}
                  className="w-full h-full object-cover transition-all duration-300"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_PROJECT_IMAGE;
                  }}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent pointer-events-none" />

                {/* Navigation controls if multiple images */}
                {imageList.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-navy-950/70 hover:bg-navy-950 text-white backdrop-blur-xs transition-colors border border-white/20 shadow-md"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev + 1) % imageList.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-navy-950/70 hover:bg-navy-950 text-white backdrop-blur-xs transition-colors border border-white/20 shadow-md"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Active Image Tag & Caption */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white text-xs">
                  <span className="px-2.5 py-1 bg-navy-950/80 backdrop-blur-md rounded-lg text-[11px] font-semibold uppercase tracking-wider text-primary-300 border border-white/10">
                    {activeImg.type ? `Stage: ${activeImg.type}` : `Photo ${currentImageIndex + 1} of ${imageList.length}`}
                  </span>
                  {activeImg.caption && (
                    <span className="text-gray-200 text-xs hidden sm:block truncate max-w-[60%] bg-navy-950/60 px-2.5 py-1 rounded-lg">
                      {activeImg.caption}
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails Strip */}
              {imageList.length > 1 && (
                <div className="px-6 py-3 bg-gray-900 flex items-center gap-2 overflow-x-auto border-t border-gray-800">
                  {imageList.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                        idx === currentImageIndex ? 'border-primary-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Case Study Details Body */}
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Meta Highlights Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200/80 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Location</span>
                    <span className="font-bold text-navy-950 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary-500" />
                      {selectedProject.location || 'Metropolitan Area'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Client</span>
                    <span className="font-bold text-navy-950 flex items-center gap-1 truncate">
                      <Building2 className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                      {selectedProject.client_name || 'Confidential Commercial'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Project Scope</span>
                    <span className="font-bold text-navy-950 flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5 text-primary-500" />
                      {selectedProject.area_size || 'Full Site'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Completion</span>
                    <span className="font-bold text-navy-950 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary-500" />
                      {selectedProject.completion_date
                        ? new Date(selectedProject.completion_date).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })
                        : 'Certified Handover'}
                    </span>
                  </div>
                </div>

                {/* Project Description Narrative */}
                {selectedProject.description && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 mb-2">Project Overview</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{selectedProject.description}</p>
                  </div>
                )}

                {/* Challenge, Solution & Results Grid */}
                <div className="grid sm:grid-cols-3 gap-4">
                  {selectedProject.challenge && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        <span>The Challenge</span>
                      </div>
                      <p className="text-amber-950/90 leading-relaxed">{selectedProject.challenge}</p>
                    </div>
                  )}

                  {selectedProject.solution && (
                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/70 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1.5">
                        <Wrench className="w-4 h-4 text-blue-600" />
                        <span>Engineering Solution</span>
                      </div>
                      <p className="text-blue-950/90 leading-relaxed">{selectedProject.solution}</p>
                    </div>
                  )}

                  {selectedProject.results && (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Delivered Outcome</span>
                      </div>
                      <p className="text-emerald-950/90 leading-relaxed">{selectedProject.results}</p>
                    </div>
                  )}
                </div>

                {/* Materials Used */}
                {selectedProject.materials_used && (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 mb-2 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-primary-500" />
                      <span>Chemicals & Material System Specified</span>
                    </h4>
                    <p className="text-xs text-navy-800 leading-relaxed font-medium">{selectedProject.materials_used}</p>
                  </div>
                )}

                {/* Action Bar */}
                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-primary-500" />
                    <span>Includes 10-Year Installation Warranty</span>
                  </div>
                  <Link
                    href="/quotation"
                    className="w-full sm:w-auto px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-xs sm:text-sm text-center transition-all shadow-md shadow-primary-500/20"
                  >
                    Request Proposal for Similar Project
                  </Link>
                </div>

              </div>
            </div>
          </div>
        );
      })()}
    </CustomerLayout>
  );
}

