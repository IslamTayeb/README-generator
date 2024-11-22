"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // Add remarkGfm for Github-flavored markdown

interface MarkdownViewerProps {
  markdown: string;
}

export function MarkdownViewer({ markdown }: MarkdownViewerProps) {
  return (
    <div className="flex flex-col h-full bg-card">
      <h2 className="text-xl font-bold p-4 text-foreground bg-card border-b">
        Github Markdown Viewer
      </h2>
      <div className="flex-grow overflow-auto p-4 bg-background">
        {/* Adding `prose` for basic typography styling */}
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
