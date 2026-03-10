import { Zap, Plus } from "lucide-react";

export default function SkillsPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Zap className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Agent Skills</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create reusable skills to extend what the AI can do.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New Skill
        </button>
      </div>
    </div>
  );
}
