"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  markdown: string;
}

export function MarkdownViewer({ markdown }: MarkdownViewerProps) {
  return (
    <div className="h-full flex flex-col bg-card">
      <h2 className="text-xl font-bold p-4 text-foreground bg-card border-b">
        Github Markdown Preview
      </h2>
      <div className="flex-grow overflow-auto bg-background">
        <div
          className="h-full overflow-auto prose prose-invert max-w-none p-5
            [&::-webkit-scrollbar]:w-[12px]
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-track]:shadow-[inset_1px_0_0_0_hsl(var(--primary)_/_0.07)]
            [&::-webkit-scrollbar-thumb]:bg-secondary
            [&::-webkit-scrollbar-thumb]:opacity-0
            hover:[&::-webkit-scrollbar-thumb]:opacity-100
            focus-within:[&::-webkit-scrollbar-thumb]:opacity-100
            [&::-webkit-scrollbar-thumb]:transition-opacity
            hover:[&::-webkit-scrollbar-thumb]:bg-primary/20
            [&_pre]:overflow-x-auto
            [&_pre::-webkit-scrollbar]:h-[6px]
            [&_pre::-webkit-scrollbar-track]:bg-transparent
            [&_pre::-webkit-scrollbar-thumb]:rounded-full
            [&_pre::-webkit-scrollbar-thumb]:bg-secondary/50
            [&_pre::-webkit-scrollbar-thumb]:opacity-0
            hover:[&_pre::-webkit-scrollbar-thumb]:opacity-100
            [&_pre::-webkit-scrollbar-thumb]:transition-opacity
            hover:[&_pre::-webkit-scrollbar-thumb]:bg-primary/15"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
