import { useState, useEffect } from 'react';
import { X, MapPin, Building2, Calendar, Ruler, Loader2 } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useSeoMeta } from '@/hooks/use-seo';
import { Link } from 'wouter';
import { supabase } from '@/lib/supabase';
import type { Project, ProjectImage } from '@/lib/types';

interface ProjectWithImages extends Project {
  images: ProjectImage[];
}

export default function Portfolio() {
  useSeoMeta('portfolio');
  const [projects, setProjects] = useState<ProjectWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState<ProjectWithImages | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    async function fetchProjects() {
      const { data, error } = await supabase
        .from('projects')
        .select('*, images:project_images(*)')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('display_order', { foreignTable: 'project_images', ascending: true });

      if (!error && data) {
        setProjects(data as ProjectWithImages[]);
      }
      setLoading(false);
    }
    fetchProjects();
  }, []);

  const categories = ['All', ...new Set(projects.map(p => p.category).filter(Boolean))];

  const filteredProjects = selectedCategory === 'All'
    ? projects
    : projects.filter(p => p.category === selectedCategory);

  const getPrimaryImage = (project: ProjectWithImages) => {
    const afterImage = project.images?.find(img => img.image_type === 'after');
    const otherImage = project.images?.[0];
    return afterImage?.image_url || otherImage?.image_url || project.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=800&q=80';
  };

  return (
    <CustomerLayout>
      {/* Hero */}
      <section className="bg-gray-50 border-b border-gray-200 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="section-label">Our Work</span>
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-primary-600 mb-4 mt-2">
            Our Portfolio
          </h1>
          <p className="text-navy-600 text-lg max-w-2xl mx-auto">
            Explore our completed projects across Kenya and East Africa. Every project
            showcases our commitment to quality and durability.
          </p>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 1 && (
        <section className="py-6 bg-white border-b border-gray-200 sticky top-16 lg:top-20 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat || 'All')}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                    selectedCategory === cat
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Projects Grid */}
      <section className="py-12 lg:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No projects found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setSelectedProject(project);
                    setCurrentImageIndex(0);
                  }}
                  className="card group text-left overflow-hidden"
                >
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img
                      src={getPrimaryImage(project)}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-sm font-medium">View Project</p>
                    </div>
                    {project.featured && (
                      <span className="absolute top-4 left-4 px-2 py-1 bg-primary-500 text-white text-xs font-medium rounded shadow-lg">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-medium text-primary-500 uppercase tracking-wide mb-2">
                      {project.service_type || project.category}
                    </p>
                    <h3 className="font-semibold text-navy-900 mb-2 group-hover:text-primary-600 transition-colors">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>{project.location}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Building2 className="w-12 h-12 text-primary-500 mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-navy-900 mb-4">
            Want to See Your Project Here?
          </h2>
          <p className="text-navy-500 mb-8 max-w-xl mx-auto">
            Let's discuss your flooring and waterproofing needs. Our team is ready to
            bring your vision to life.
          </p>
          <Link href="/quotation" className="btn-primary">
            Start Your Project
          </Link>
        </div>
      </section>

      {/* Project Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Image Gallery */}
            <div className="relative aspect-video bg-gray-100">
              {selectedProject.images && selectedProject.images.length > 0 ? (
                <>
                  <img
                    src={selectedProject.images[currentImageIndex]?.image_url || getPrimaryImage(selectedProject)}
                    alt={selectedProject.title}
                    className="w-full h-full object-cover"
                  />
                  {selectedProject.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev - 1 + selectedProject.images.length) % selectedProject.images.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev + 1) % selectedProject.images.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {selectedProject.images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                      {/* Image type badge */}
                      {selectedProject.images[currentImageIndex]?.image_type && (
                        <span className="absolute top-4 left-4 px-2 py-1 bg-gray-900/80 text-white text-xs font-medium rounded capitalize">
                          {selectedProject.images[currentImageIndex].image_type}
                        </span>
                      )}
                    </>
                  )}
                </>
              ) : (
                <img
                  src={getPrimaryImage(selectedProject)}
                  alt={selectedProject.title}
                  className="w-full h-full object-cover"
                />
              )}
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm font-medium text-primary-600 uppercase tracking-wide mb-2">
                {selectedProject.service_type || selectedProject.category}
              </p>
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">
                {selectedProject.title}
              </h2>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
                {selectedProject.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedProject.location}</span>
                  </div>
                )}
                {selectedProject.completion_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Completed {new Date(selectedProject.completion_date).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
                {selectedProject.area_size && (
                  <div className="flex items-center gap-1">
                    <Ruler className="w-4 h-4" />
                    <span>{selectedProject.area_size}</span>
                  </div>
                )}
              </div>

              {selectedProject.description && (
                <p className="text-gray-600 mb-6">{selectedProject.description}</p>
              )}

              {selectedProject.client_name && (
                <p className="text-sm text-gray-500 mb-2">
                  <span className="font-medium">Client:</span> {selectedProject.client_name}
                </p>
              )}

              {selectedProject.challenge && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-1">Challenge</h4>
                  <p className="text-gray-600 text-sm">{selectedProject.challenge}</p>
                </div>
              )}

              {selectedProject.solution && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-1">Solution</h4>
                  <p className="text-gray-600 text-sm">{selectedProject.solution}</p>
                </div>
              )}

              {selectedProject.results && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-1">Results</h4>
                  <p className="text-gray-600 text-sm">{selectedProject.results}</p>
                </div>
              )}

              <div className="pt-6 border-t border-gray-200 mt-6">
                <Link
                  href="/quotation"
                  className="btn-primary w-full text-center block"
                >
                  Request Similar Project
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
