import { useState, useMemo, useCallback, useRef, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image,
  ImageOff,
  ChevronDown,
  ChevronUp,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Document, DocumentImage } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PageGroup {
  pageNo: number;
  images: DocumentImage[];
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function GallerySkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-5 bg-muted rounded w-32" />
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-video rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function GalleryEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <ImageOff className="w-10 h-10 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">No images extracted</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        This document does not contain any extractable images
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------
function GalleryLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: {
  images: DocumentImage[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const img = images[currentIndex];
  if (!img) return null;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    },
    [currentIndex, images.length, onClose, onNavigate]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white z-10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Left nav */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Right nav */}
      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Image + metadata */}
      <div className="flex gap-6 max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <img
          src={img.url}
          alt={img.caption || `Image from page ${img.page_no}`}
          className="max-w-full max-h-[80vh] rounded-lg object-contain"
        />
        <div className="w-64 flex-shrink-0 text-white/90 space-y-3 self-end hidden lg:block">
          {img.caption && <p className="text-sm leading-relaxed">{img.caption}</p>}
          <div className="space-y-1 text-xs text-white/60">
            <p>Page {img.page_no}</p>
            {img.width > 0 && <p>{img.width} x {img.height}px</p>}
          </div>
          <p className="text-xs text-white/40">
            {currentIndex + 1} / {images.length}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// LazyImage — with IntersectionObserver
// ---------------------------------------------------------------------------
function LazyImage({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const imgRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!imgRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className} onClick={onClick}>
      {isVisible ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
          )}
          <img
            src={src}
            alt={alt}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0"
            )}
            loading="lazy"
            onLoad={() => setLoaded(true)}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-muted rounded-lg" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page group section
// ---------------------------------------------------------------------------
const PageSection = memo(function PageSection({
  group,
  allImages,
  onImageClick,
}: {
  group: PageGroup;
  allImages: DocumentImage[];
  onImageClick: (globalIndex: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="space-y-2">
      {/* Page header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        <span>Page {group.pageNo}</span>
        <span className="text-muted-foreground/50">({group.images.length} image{group.images.length !== 1 ? "s" : ""})</span>
      </button>

      {/* Image grid */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {group.images.map((img) => {
                const globalIndex = allImages.findIndex((i) => i.image_id === img.image_id);
                return (
                  <motion.div
                    key={img.image_id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative rounded-lg overflow-hidden bg-muted cursor-pointer aspect-video"
                    onClick={() => onImageClick(globalIndex)}
                  >
                    <LazyImage
                      src={img.url}
                      alt={img.caption || `Page ${img.page_no}`}
                      className="w-full h-full relative"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                      <div className="p-1.5 w-full translate-y-full group-hover:translate-y-0 transition-transform">
                        <p className="text-[10px] text-white/90 truncate">
                          {img.caption || `Image ${img.image_id.slice(0, 8)}`}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ---------------------------------------------------------------------------
// ImageGallery
// ---------------------------------------------------------------------------
interface ImageGalleryProps {
  doc: Document;
}

export const ImageGallery = memo(function ImageGallery({ doc }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // ---- Fetch images ----
  const { data: images, isLoading } = useQuery({
    queryKey: ["document-images", doc.id],
    queryFn: () => api.get<DocumentImage[]>(`/documents/${doc.id}/images`),
    enabled: doc.status === "indexed",
    staleTime: 5 * 60 * 1000,
  });

  // ---- Group images by page ----
  const pageGroups = useMemo<PageGroup[]>(() => {
    if (!images || images.length === 0) return [];
    const map = new Map<number, DocumentImage[]>();
    for (const img of images) {
      const list = map.get(img.page_no) ?? [];
      list.push(img);
      map.set(img.page_no, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([pageNo, imgs]) => ({ pageNo, images: imgs }));
  }, [images]);

  // ---- Flat list for lightbox navigation ----
  const allImages = useMemo(
    () => pageGroups.flatMap((g) => g.images),
    [pageGroups]
  );

  const handleImageClick = useCallback((globalIndex: number) => {
    setLightboxIndex(globalIndex);
  }, []);

  // ---- States ----
  if (doc.status !== "indexed") {
    return <GalleryEmpty />;
  }
  if (isLoading) return <GallerySkeleton />;
  if (!images || images.length === 0) return <GalleryEmpty />;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Image className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {images.length} Image{images.length !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-muted-foreground">
          across {pageGroups.length} page{pageGroups.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Page groups */}
      {pageGroups.length === 1 ? (
        // Single page — show grid directly without page header
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allImages.map((img, i) => (
            <motion.div
              key={img.image_id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="group relative rounded-lg overflow-hidden bg-muted cursor-pointer aspect-video"
              onClick={() => handleImageClick(i)}
            >
              <LazyImage
                src={img.url}
                alt={img.caption || `Page ${img.page_no}`}
                className="w-full h-full relative"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <div className="p-1.5 w-full translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-[10px] text-white/90 truncate">
                    {img.caption || `Image ${img.image_id.slice(0, 8)}`}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        // Multiple pages — group by page
        <div className="space-y-4">
          {pageGroups.map((group) => (
            <PageSection
              key={group.pageNo}
              group={group}
              allImages={allImages}
              onImageClick={handleImageClick}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <GalleryLightbox
            images={allImages}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </AnimatePresence>
    </div>
  );
});
