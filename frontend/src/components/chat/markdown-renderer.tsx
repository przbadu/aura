"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-border/50 bg-muted/50">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/80 px-4 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code({ className, children, ...props }) {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="rounded bg-muted/80 px-1.5 py-0.5 text-[0.85em] font-mono text-foreground" {...props}>
                {children}
              </code>
            );
          }
          return <CodeBlock className={className}>{String(children).replace(/\n$/, "")}</CodeBlock>;
        },
        p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => <h1 className="mb-3 mt-6 text-xl font-bold first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-5 text-lg font-semibold first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-primary/30 pl-4 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="border-b border-border/50 bg-muted/50">{children}</thead>,
        th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</th>,
        td: ({ children }) => <td className="border-t border-border/30 px-3 py-2">{children}</td>,
        hr: () => <hr className="my-4 border-border/50" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
