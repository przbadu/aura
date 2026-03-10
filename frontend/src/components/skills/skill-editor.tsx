"use client";

import * as React from "react";
import {
  Save,
  Trash2,
  Share2,
  Download,
  MessageSquare,
  Zap,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useSkillsStore } from "@/stores/skills-store";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function SkillEditor() {
  const {
    skills,
    activeSkillId,
    draft,
    isDirty,
    isSaving,
    updateDraft,
    createSkill,
    updateSkill,
    deleteSkill,
    toggleShare,
    setActiveSkill,
  } = useSkillsStore();

  const activeSkill = activeSkillId
    ? skills.find((s) => s.id === activeSkillId)
    : null;

  const isCreating = !activeSkillId && draft !== null;

  // Validation
  const nameValue = draft?.name ?? "";
  const descValue = draft?.description ?? "";
  const instrValue = draft?.instructions ?? "";
  const isValidName =
    nameValue.length > 0 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(nameValue);
  const isValidDesc = descValue.length >= 20 && descValue.length <= 1024;
  const canSave =
    isValidName && isValidDesc && instrValue.length > 0 && (isDirty || isCreating);

  const handleSave = async () => {
    if (!canSave || !draft) return;

    try {
      if (isCreating) {
        await createSkill({
          name: draft.name!,
          description: draft.description!,
          instructions: draft.instructions!,
          enabled: draft.enabled ?? true,
        });
      } else if (activeSkillId) {
        await updateSkill(activeSkillId, {
          name: draft.name,
          description: draft.description,
          instructions: draft.instructions,
          enabled: draft.enabled,
        });
      }
    } catch (error) {
      console.error("Failed to save skill:", error);
    }
  };

  const handleDelete = async () => {
    if (!activeSkillId) return;
    if (!window.confirm("Are you sure you want to delete this skill?")) return;
    try {
      await deleteSkill(activeSkillId);
    } catch (error) {
      console.error("Failed to delete skill:", error);
    }
  };

  const handleShare = async () => {
    if (!activeSkillId) return;
    try {
      await toggleShare(activeSkillId);
    } catch (error) {
      console.error("Failed to toggle sharing:", error);
    }
  };

  const handleExport = () => {
    if (!activeSkill) return;
    const data = {
      name: activeSkill.name,
      description: activeSkill.description,
      instructions: activeSkill.instructions,
      enabled: activeSkill.enabled,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSkill.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    updateDraft({ name: slugify(raw) });
  };

  // Empty state
  if (!draft) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Zap className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Select a skill to edit
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a skill from the list or create a new one to get started.
          </p>
        </div>
      </div>
    );
  }

  const isGlobal = activeSkill && !activeSkill.user_id;

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            {isCreating ? "New Skill" : "Edit Skill"}
          </h2>
          {activeSkill && (
            <div className="flex items-center gap-1.5">
              {isGlobal && (
                <Badge variant="secondary" className="text-[10px]">
                  Global
                </Badge>
              )}
              {!draft.enabled && (
                <Badge variant="outline" className="text-[10px]">
                  Disabled
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {activeSkillId && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleShare}
                title={isGlobal ? "Make Private" : "Share Globally"}
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleExport}
                title="Export"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  /* TODO: open chat with skill context */
                }}
                title="Try in Chat"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <Button
                variant="destructive"
                size="icon-sm"
                onClick={handleDelete}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {isCreating && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSkill(null)}
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            disabled={!canSave || isSaving}
            onClick={handleSave}
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 px-6 py-6">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Name</label>
            <Input
              value={nameValue}
              onChange={handleNameChange}
              placeholder="my-custom-skill"
              className={cn(
                "font-mono text-sm",
                nameValue.length > 0 &&
                  !isValidName &&
                  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
              )}
            />
            <p
              className={cn(
                "text-[11px]",
                nameValue.length > 0 && !isValidName
                  ? "flex items-center gap-1 text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {nameValue.length > 0 && !isValidName && (
                <AlertCircle className="inline h-3 w-3" />
              )}
              Lowercase letters, numbers, and hyphens only (e.g.
              &quot;web-search&quot;)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Description
              </label>
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  descValue.length > 0 && !isValidDesc
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {descValue.length} / 1024
              </span>
            </div>
            <Textarea
              value={descValue}
              onChange={(e) => updateDraft({ description: e.target.value })}
              placeholder="A brief description of what this skill does..."
              rows={3}
              maxLength={1024}
              className={cn(
                "resize-none text-sm",
                descValue.length > 0 &&
                  !isValidDesc &&
                  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
              )}
            />
            {descValue.length > 0 && descValue.length < 20 && (
              <p className="flex items-center gap-1 text-[11px] text-destructive">
                <AlertCircle className="inline h-3 w-3" />
                Minimum 20 characters required
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Instructions
              </label>
              <span className="text-[11px] text-muted-foreground">
                Markdown supported
              </span>
            </div>
            <Textarea
              value={instrValue}
              onChange={(e) => updateDraft({ instructions: e.target.value })}
              placeholder={`Write the instructions for this skill...\n\nYou can use **Markdown** formatting to structure your instructions.`}
              rows={12}
              className="min-h-[240px] resize-y font-mono text-[13px] leading-relaxed"
            />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Enabled</p>
              <p className="text-xs text-muted-foreground">
                When disabled, this skill will not be available to the AI agent.
              </p>
            </div>
            <Switch
              checked={draft.enabled ?? true}
              onCheckedChange={(checked: boolean) =>
                updateDraft({ enabled: checked })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
