"use client";

import * as React from "react";
import { SkillList } from "@/components/skills/skill-list";
import { SkillEditor } from "@/components/skills/skill-editor";
import { useSkillsStore } from "@/stores/skills-store";

export function SkillsLayout() {
  const { fetchSkills, activeSkillId, draft } = useSkillsStore();

  React.useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const hasSelection = activeSkillId !== null || draft !== null;

  return (
    <div className="flex h-full">
      {/* Left panel - skill list */}
      <div
        className={`${
          hasSelection ? "hidden md:flex" : "flex"
        } w-full flex-col border-r border-border/50 bg-sidebar md:w-[300px] lg:w-[320px]`}
      >
        <SkillList />
      </div>

      {/* Right panel - editor */}
      <div
        className={`${
          hasSelection ? "flex" : "hidden md:flex"
        } flex-1 flex-col bg-background`}
      >
        {/* Mobile back button */}
        {hasSelection && (
          <div className="flex items-center border-b border-border/50 px-3 py-2 md:hidden">
            <button
              onClick={() => {
                useSkillsStore.getState().setActiveSkill(null);
                useSkillsStore.getState().setDraft(null);
              }}
              className="text-sm font-medium text-primary"
            >
              &larr; Back to Skills
            </button>
          </div>
        )}
        <SkillEditor />
      </div>
    </div>
  );
}
