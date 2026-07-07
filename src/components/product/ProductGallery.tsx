import { useState } from 'react';
import { ZoomIn, X, Play, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductGalleryProps {
  images: string[];
  videoUrl?: string | null;
  videoThumbnail?: string | null;
  image360Url?: string | null;
  productName: string;
}

export function ProductGallery({ images, videoUrl, videoThumbnail, image360Url, productName }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const allMedia = [
    ...images.map((url, idx) => ({ type: 'image' as const, url, id: idx })),
    ...(videoUrl ? [{ type: 'video' as const, url: videoUrl, thumbnail: videoThumbnail, id: 'video' }] : []),
    ...(image360Url ? [{ type: '360' as const, url: image360Url, id: '360' }] : []),
  ];

  const handlePrevious = () => {
    setSelectedImage((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedImage((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1));
  };

  const selectedMedia = allMedia[selectedImage];

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group">
        {selectedMedia.type === 'image' && (
          <>
            <img
              src={selectedMedia.url}
              alt={`${productName} - View ${selectedImage + 1}`}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            />
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Fullscreen"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </>
        )}

        {selectedMedia.type === 'video' && (
          <div className="w-full h-full flex items-center justify-center bg-black">
            {showVideo ? (
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : (
              <button
                onClick={() => setShowVideo(true)}
                className="relative group/video"
              >
                {selectedMedia.thumbnail ? (
                  <img
                    src={selectedMedia.thumbnail}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-16 h-16 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/video:bg-black/40 transition-colors">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-gray-900 ml-1" />
                  </div>
                </div>
              </button>
            )}
          </div>
        )}

        {selectedMedia.type === '360' && (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <RotateCw className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">360° View</p>
              <p className="text-xs text-gray-400 mt-1">Drag to rotate</p>
            </div>
          </div>
        )}

        {/* Navigation Arrows */}
        {allMedia.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {allMedia.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allMedia.map((media, idx) => (
            <button
              key={media.id}
              onClick={() => {
                setSelectedImage(idx);
                setShowVideo(false);
                setIsZoomed(false);
              }}
              className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                selectedImage === idx ? 'border-primary-500' : 'border-transparent hover:border-gray-300'
              }`}
              aria-label={`View ${idx + 1}`}
            >
              {media.type === 'image' && (
                <img
                  src={media.url}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              {media.type === 'video' && (
                <>
                  <img
                    src={media.thumbnail || media.url}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                </>
              )}
              {media.type === '360' && (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <RotateCw className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close fullscreen"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedMedia.type === 'image' ? selectedMedia.url : ''}
            alt={productName}
            className="max-w-full max-h-full object-contain"
          />
          {allMedia.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
