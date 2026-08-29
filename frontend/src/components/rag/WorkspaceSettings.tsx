import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Settings2,
  X,
  Save,
  RotateCcw,
  Plus,
  Globe,
  Tags,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { KnowledgeBase, UpdateWorkspace } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANGUAGE_OPTIONS = [
  { value: "", label: "Default (from server)" },
  { value: "English", label: "English" },
  { value: "Vietnamese", label: "Vietnamese" },
  { value: "Chinese", label: "Chinese" },
  { value: "Japanese", label: "Japanese" },
  { value: "Korean", label: "Korean" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Spanish", label: "Spanish" },
];

const DEFAULT_ENTITY_TYPES = [
  "Organization", "Person", "Product", "Location", "Event",
  "Financial_Metric", "Technology", "Date", "Regulation",
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WorkspaceSettingsProps {
  workspace: KnowledgeBase;
  onSave: (data: UpdateWorkspace) => Promise<void>;
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Tag Input (for entity types)
// ---------------------------------------------------------------------------

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (value: string) => {
    const trimmed = value.trim().replace(/\s+/g, "_");
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 min-h-[40px] rounded-md border border-input bg-background cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md bg-primary/10 text-primary border border-primary/20"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(i); }}
            className="hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? placeholder : "Add type..."}
        className="flex-1 min-w-[80px] bg-transparent text-xs outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WorkspaceSettings({
  workspace,
  onSave,
  open,
  onClose,
}: WorkspaceSettingsProps) {
  const [language, setLanguage] = useState(workspace.kg_language ?? "");
  const [entityTypes, setEntityTypes] = useState<string[]>(
    workspace.kg_entity_types ?? []
  );
  const [saving, setSaving] = useState(false);

  // Sync when workspace changes
  useEffect(() => {
    setLanguage(workspace.kg_language ?? "");
    setEntityTypes(workspace.kg_entity_types ?? []);
  }, [workspace.kg_language, workspace.kg_entity_types]);

  const hasChanges =
    language !== (workspace.kg_language ?? "") ||
    JSON.stringify(entityTypes) !== JSON.stringify(workspace.kg_entity_types ?? []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave({
        kg_language: language || null,
        kg_entity_types: entityTypes.length > 0 ? entityTypes : null,
      });
      toast.success("Workspace settings saved");
      onClose();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [language, entityTypes, onSave, onClose]);

  const handleReset = () => {
    setLanguage("");
    setEntityTypes([]);
  };

  const handleLoadDefaults = () => {
    setEntityTypes(DEFAULT_ENTITY_TYPES);
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Workspace Settings</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* KG Language */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Globe className="w-3.5 h-3.5" />
            KG Language
          </label>
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="h-8 text-xs"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Language used for KG entity extraction. Empty = server default.
          </p>
        </div>

        {/* KG Entity Types */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tags className="w-3.5 h-3.5" />
              KG Entity Types
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadDefaults}
              className="h-6 text-[10px] px-2 text-muted-foreground"
            >
              <Plus className="w-3 h-3 mr-0.5" />
              Load defaults
            </Button>
          </div>
          <TagInput
            tags={entityTypes}
            onChange={setEntityTypes}
            placeholder="Organization, Person, Product..."
          />
          <p className="text-[10px] text-muted-foreground">
            Entity types for Knowledge Graph extraction. Press Enter or comma to add. Empty = server default.
          </p>
        </div>

        {/* Info box */}
        <div className="rounded-md border border-blue-400/20 bg-blue-400/5 p-2.5">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            These settings affect how documents are processed in this workspace.
            Changes apply to newly analyzed documents — existing documents keep
            their current KG data. Re-analyze documents to apply new settings.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-7 text-xs gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to defaults
        </Button>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="h-7 text-xs gap-1"
          >
            <Save className="w-3 h-3" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
