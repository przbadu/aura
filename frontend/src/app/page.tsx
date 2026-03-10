import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Chat App</h1>
      <p className="max-w-md text-center text-muted-foreground">
        AI-powered chat application with skills and document management.
      </p>
      <div className="flex gap-4">
        <Link
          href="/chat"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Start Chatting
        </Link>
        <Link
          href="/skills"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Browse Skills
        </Link>
      </div>
    </div>
  );
}
