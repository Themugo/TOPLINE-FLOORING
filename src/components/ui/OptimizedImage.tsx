import React, { useState } from 'react';
import { optimizeImageUrl } from '@/lib/image-compressor';
import { ImageOff } from 'lucide-react';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  priority?: boolean;
  webpUrl?: string | null;
  avifUrl?: string | null;
  responsiveSizes?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  } | null;
  aspectRatio?: string; // e.g. "16/9", "4/3", "1/1"
  fallbackSrc?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  webpUrl,
  avifUrl,
  responsiveSizes,
  aspectRatio,
  fallbackSrc = 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=800&q=80',
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  style,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Auto-optimize Unsplash URLs for WebP & compression
  const optimizedSrc = optimizeImageUrl(src, typeof width === 'number' ? width : 800);

  // Build responsive srcset if variants exist
  let srcSet: string | undefined;
  if (responsiveSizes) {
    const parts: string[] = [];
    if (responsiveSizes.small) parts.push(`${responsiveSizes.small} 400w`);
    if (responsiveSizes.medium) parts.push(`${responsiveSizes.medium} 800w`);
    if (responsiveSizes.large) parts.push(`${responsiveSizes.large} 1200w`);
    if (parts.length > 0) srcSet = parts.join(', ');
  }

  const containerStyle: React.CSSProperties = {
    ...(aspectRatio ? { aspectRatio } : {}),
    ...style,
  };

  const finalAlt = alt && alt.trim() ? alt : 'Flooring surface image';

  if (hasError) {
    return (
      <div
        className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-4 rounded text-gray-400 text-xs ${className}`}
        style={containerStyle}
      >
        <div className="flex flex-col items-center gap-1">
          <ImageOff className="w-5 h-5 opacity-60" />
          <span>Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <picture className="inline-block w-full h-full">
      {avifUrl && <source srcSet={avifUrl} type="image/avif" />}
      {webpUrl && <source srcSet={webpUrl} type="image/webp" />}
      <img
        src={hasError ? fallbackSrc : optimizedSrc}
        alt={finalAlt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-90'
        } ${className}`}
        style={containerStyle}
        {...props}
      />
    </picture>
  );
};
