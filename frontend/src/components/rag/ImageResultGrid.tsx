import { useState, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentImage } from "@/types";

// ---------------------------------------------------------------------------
// Image lightbox
// ---------------------------------------------------------------------------
function ImageLightbox({
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Navigation */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
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
          <p className="text-xs text-white/40">{currentIndex + 1} / {images.length}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ImageResultGrid
// ---------------------------------------------------------------------------
interface ImageResultGridProps {
  images: DocumentImage[];
}

export const ImageResultGrid = memo(function ImageResultGrid({ images }: ImageResultGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Image className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Related Images ({images.length})</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((img, i) => (
          <motion.div
            key={img.image_id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "group relative rounded-lg overflow-hidden bg-muted cursor-pointer",
              "aspect-video"
            )}
            onClick={() => setLightboxIndex(i)}
          >
            <img
              src={img.url}
              alt={img.caption || `Page ${img.page_no}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
              <div className="p-1.5 w-full translate-y-full group-hover:translate-y-0 transition-transform">
                <p className="text-[10px] text-white/90 truncate">{img.caption || `Page ${img.page_no}`}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <ImageLightbox
            images={images}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </AnimatePresence>
    </div>
  );
});
