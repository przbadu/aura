"use client";

import * as React from "react";
import {
  Search,
  Plus,
  PenLine,
  Sparkles,
  FileUp,
  Zap,
  Globe,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSkillsStore } from "@/stores/skills-store";

export function SkillList() {
  const [search, setSearch] = React.useState("");

  const {
    skills,
    activeSkillId,
    isLoading,
    setActiveSkill,
    startNewSkill,
    draft,
  } = useSkillsStore();

  const filteredSkills = React.useMemo(() => {
    if (!search.trim()) return skills;
    const q = search.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [skills, search]);

  const isCreating = !activeSkillId && draft !== null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Skills</h2>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="default" size="sm">
                <Plus className="h-3.5 w-3.5" />
                New
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem onClick={startNewSkill}>
              <PenLine className="h-4 w-4" />
              Create Manually
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Sparkles className="h-4 w-4" />
              Create with AI
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <FileUp className="h-4 w-4" />
              Import from File
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Skill list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {isLoading ? (
            <div className="flex flex-col gap-2 px-2 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-muted/50"
                />
              ))}
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Zap className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                {search ? "No skills match your search" : "No skills yet"}
              </p>
            </div>
          ) : (
            filteredSkills.map((skill) => {
              const isActive = skill.id === activeSkillId && !isCreating;
              const isGlobal = !skill.user_id;

              return (
                <button
                  key={skill.id}
                  onClick={() => setActiveSkill(skill.id)}
                  className={cn(
                    "group relative flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-all duration-150",
                    isActive
                      ? "bg-primary/10 ring-1 ring-primary/20"
                      : "hover:bg-accent/50",
                    !skill.enabled && "opacity-50"
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                  )}

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        isActive ? "text-primary" : "text-foreground"
                      )}
                    >
                      {skill.name}
                    </span>
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      {isGlobal && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1.5 text-[10px]"
                        >
                          <Globe className="mr-0.5 h-2.5 w-2.5" />
                          Global
                        </Badge>
                      )}
                      {!skill.enabled && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[10px]"
                        >
                          Off
                        </Badge>
                      )}
                    </div>
                  </div>
                  {skill.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {skill.description}
                    </p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
