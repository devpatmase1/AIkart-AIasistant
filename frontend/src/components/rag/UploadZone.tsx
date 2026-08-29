import { useState, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ".pdf,.txt,.docx,.md,.pptx";
const ACCEPTED_EXTENSIONS = new Set(["pdf", "txt", "docx", "md", "pptx"]);
const MAX_SIZE_MB = 50;

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
  compact?: boolean;
  /** Always-visible mini drag-drop zone */
  mini?: boolean;
}

export const UploadZone = memo(function UploadZone({ onUpload, isUploading, compact, mini }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED_EXTENSIONS.has(ext)) return `Unsupported format: .${ext}`;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File too large (max ${MAX_SIZE_MB}MB)`;
    return null;
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const error = validateFile(file);
        if (error) {
          // imported in parent — use toast there
          continue;
        }
        onUpload(file);
      }
    },
    [onUpload, validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  if (mini) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={(e) => { handleFiles(e.target.files); if (inputRef.current) inputRef.current.value = ""; }}
          className="hidden"
        />
        <motion.div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          animate={isDragOver ? { scale: 1.01 } : { scale: 1 }}
          className={cn(
            "h-full rounded-lg border-2 border-dashed cursor-pointer transition-colors duration-200",
            "flex flex-col items-center justify-center",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
            isUploading && "opacity-60 pointer-events-none"
          )}
        >
          <AnimatePresence mode="wait">
            {isDragOver ? (
              <motion.div
                key="drop"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center"
              >
                <FileUp className="w-6 h-6 text-primary mb-1" />
                <p className="text-xs font-medium text-primary">Drop files here</p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <Upload className={cn("w-6 h-6 text-muted-foreground mb-1", isUploading && "animate-pulse")} />
                <p className="text-xs font-medium">
                  {isUploading ? "Uploading..." : "Drop files or click to upload"}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  PDF, DOCX, PPTX, TXT, MD (max {MAX_SIZE_MB}MB)
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </>
    );
  }

  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={(e) => { handleFiles(e.target.files); if (inputRef.current) inputRef.current.value = ""; }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-50 disabled:pointer-events-none transition-colors"
          )}
        >
          <Upload className={cn("w-4 h-4", isUploading && "animate-pulse")} />
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={(e) => { handleFiles(e.target.files); if (inputRef.current) inputRef.current.value = ""; }}
        className="hidden"
      />
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        animate={isDragOver ? { scale: 1.01 } : { scale: 1 }}
        className={cn(
          "relative rounded-lg border-2 border-dashed cursor-pointer transition-colors duration-200",
          "flex flex-col items-center justify-center py-8 px-4",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          isUploading && "opacity-60 pointer-events-none"
        )}
      >
        <AnimatePresence mode="wait">
          {isDragOver ? (
            <motion.div
              key="drop"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <FileUp className="w-8 h-8 text-primary mb-2" />
              <p className="text-sm font-medium text-primary">Drop files here</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {isUploading ? "Uploading..." : "Drop files or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, PPTX, TXT, MD (max {MAX_SIZE_MB}MB)
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
});
