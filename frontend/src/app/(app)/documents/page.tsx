import { FileText, Upload } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <FileText className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Knowledge Base</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload documents to give the AI context about your domain.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      </div>
    </div>
  );
}
