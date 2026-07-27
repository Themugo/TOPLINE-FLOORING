import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Building2,
  Maximize2,
  Minimize2,
  Search,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import type { Project } from '@/lib/types';

interface ProjectDistributionMapProps {
  projects: Project[];
  onSelectProject?: (project: Project) => void;
}

// Known location coordinates database for regional project locations
const KNOWN_COORDINATES: Record<string, { lat: number; lng: number; region: string }> = {
  // Metro Hubs & Neighborhoods
  metro: { lat: 38.8951, lng: -77.0364, region: 'Metro Center' },
  cbd: { lat: 38.8951, lng: -77.0364, region: 'Central District' },
  central: { lat: 38.8951, lng: -77.0364, region: 'Central District' },
  west: { lat: 38.9000, lng: -77.0500, region: 'West District' },
  east: { lat: 38.8900, lng: -77.0100, region: 'East District' },
  industrial: { lat: 38.8800, lng: -77.0400, region: 'Industrial Zone' },
  south: { lat: 38.8700, lng: -77.0300, region: 'South District' },
  north: { lat: 38.9100, lng: -77.0300, region: 'North District' },

  // Regional Suburbs
  northside: { lat: 38.9200, lng: -77.0200, region: 'North Suburbs' },
  southside: { lat: 38.8600, lng: -77.0400, region: 'South Suburbs' },
  westside: { lat: 38.9000, lng: -77.0700, region: 'West Suburbs' },
  eastside: { lat: 38.8900, lng: -77.0000, region: 'East Suburbs' },
};

// Deterministic coordinate offset fallback based on location text string
function getDeterministicOffset(text: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 100) - 50) / 1000; // ~ +-0.05 deg
  const lngOffset = ((Math.abs(hash >> 3) % 100) - 50) / 1000;
  return { lat: latOffset, lng: lngOffset };
}

// Geocode project location to lat/lng
function geocodeProjectLocation(locStr?: string | null): {
  lat: number;
  lng: number;
  region: string;
} {
  if (!locStr) {
    // Default center
    return { lat: 38.8951, lng: -77.0364, region: 'Central Metro' };
  }

  const clean = locStr.toLowerCase().trim();

  // 1. Direct key match
  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (clean.includes(key)) {
      const offset = getDeterministicOffset(locStr);
      return {
        lat: coords.lat + offset.lat,
        lng: coords.lng + offset.lng,
        region: coords.region,
      };
    }
  }

  // 2. Fallback to metro area with deterministic spread
  const offset = getDeterministicOffset(locStr);
  return {
    lat: 38.8951 + offset.lat * 1.5,
    lng: -77.0364 + offset.lng * 1.5,
    region: 'Metro Area',
  };
}

// Marker color generator based on service type
function getMarkerColor(serviceType?: string | null): string {
  const st = (serviceType || '').toLowerCase();
  if (st.includes('epoxy')) return '#059669'; // Emerald
  if (st.includes('waterproof')) return '#2563eb'; // Blue
  if (st.includes('terrazzo')) return '#7c3aed'; // Purple
  if (st.includes('polish') || st.includes('concrete')) return '#d97706'; // Amber
  return '#1e293b'; // Dark slate default
}

export function ProjectDistributionMap({
  projects,
  onSelectProject,
}: ProjectDistributionMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Map project data into geocoded items
  const geocodedProjects = useMemo(() => {
    return projects.map((p) => {
      const { lat, lng, region } = geocodeProjectLocation(p.location);
      return {
        ...p,
        lat,
        lng,
        region,
      };
    });
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return geocodedProjects.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.service_type || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [geocodedProjects, searchQuery]);

  // Regional breakdown counts
  const regionalCounts = useMemo(() => {
    return geocodedProjects.reduce<Record<string, number>>((acc, p) => {
      acc[p.region] = (acc[p.region] || 0) + 1;
      return acc;
    }, {});
  }, [geocodedProjects]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default view centered on Metro region
      const map = L.map(mapContainerRef.current, {
        center: [38.8951, -77.0364],
        zoom: 10,
        zoomControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add CartoDB Positron tiles for clean modern map styling
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers on Map when filteredProjects changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (filteredProjects.length === 0) return;

    const bounds = L.latLngBounds([]);

    filteredProjects.forEach((p) => {
      const color = getMarkerColor(p.service_type);

      // Create custom SVG HTML Marker
      const customHtml = `
        <div class="group relative flex items-center justify-center cursor-pointer">
          <div class="w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold transition-transform group-hover:scale-125" style="background-color: ${color};">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5"></path>
            </svg>
          </div>
          <div class="absolute -bottom-1 w-2 h-2 rotate-45" style="background-color: ${color};"></div>
        </div>
      `;

      const icon = L.divIcon({
        html: customHtml,
        className: 'custom-map-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([p.lat, p.lng], { icon });

      // Popup html content
      const popupContent = `
        <div style="font-family: sans-serif; min-width: 200px; max-width: 260px; padding: 4px;">
          <div style="display: flex; items-center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${color}; bg-color: #f1f5f9; padding: 2px 6px; border-radius: 4px;">
              ${p.service_type || 'Flooring Service'}
            </span>
            <span style="font-size: 11px; color: #64748b; font-weight: 600;">
              ${p.category || 'Project'}
            </span>
          </div>
          <h4 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; line-height: 1.3;">
            ${p.title}
          </h4>
          ${
            p.client_name
              ? `<p style="font-size: 11px; color: #475569; margin: 0 0 6px 0; font-weight: 600;">Client: ${p.client_name}</p>`
              : ''
          }
          <div style="font-size: 11px; color: #64748b; border-top: 1px solid #f1f5f9; pt: 6px; margin-top: 6px; display: flex; align-items: center; justify-content: space-between;">
            <span>📍 ${p.location || 'Metropolitan Area'}</span>
            ${p.area_size ? `<span>📐 ${p.area_size}</span>` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        setActiveProject(p);
      });

      markersGroup.addLayer(marker);
      bounds.extend([p.lat, p.lng]);
    });

    if (filteredProjects.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [filteredProjects]);

  // Focus specific project on map click
  const focusProjectOnMap = (p: typeof geocodedProjects[0]) => {
    setActiveProject(p);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([p.lat, p.lng], 14, { duration: 1.2 });
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'relative h-[560px]'
      }`}
    >
      {/* Map Header Toolbar */}
      <div className="p-3.5 bg-gray-50/90 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <MapPin className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
              Geographical Project Distribution
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {filteredProjects.length} Pinmapped
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              Interactive map of site locations & completed industrial flooring projects.
            </p>
          </div>
        </div>

        {/* Search & Fullscreen Controls */}
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search site location, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Map Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="flex-1 w-full h-full z-0" />

        {/* Sidebar Panel for Pins & Regional Overview */}
        <div className="w-72 sm:w-80 bg-white border-l border-gray-200 flex flex-col hidden md:flex z-10 flex-shrink-0">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary-600" /> Project Locations
            </span>
            <span className="text-[11px] font-mono text-gray-500">{filteredProjects.length} sites</span>
          </div>

          {/* Regional Hub Badges */}
          <div className="p-2.5 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
            {Object.entries(regionalCounts).map(([region, count]) => (
              <span
                key={region}
                className="px-2 py-1 bg-gray-100 text-gray-700 font-bold rounded-lg whitespace-nowrap border border-gray-200/80"
              >
                {region}: <span className="text-primary-700">{count}</span>
              </span>
            ))}
          </div>

          {/* List of Sites */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredProjects.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 italic">
                No matching project sites found.
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = activeProject?.id === p.id;
                const markerColor = getMarkerColor(p.service_type);

                return (
                  <div
                    key={p.id}
                    onClick={() => focusProjectOnMap(p)}
                    className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: markerColor }}
                          />
                          <h4 className="text-xs font-bold text-gray-900 truncate">{p.title}</h4>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                          {p.client_name ? `Client: ${p.client_name}` : p.service_type}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-gray-400" /> {p.location || 'Metropolitan Area'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 self-center" />
                    </div>

                    {isSelected && onSelectProject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProject(p);
                        }}
                        className="mt-2 w-full text-[11px] py-1 bg-white border border-emerald-300 text-emerald-800 font-bold rounded-lg hover:bg-emerald-100 flex items-center justify-center gap-1"
                      >
                        Edit Details <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
