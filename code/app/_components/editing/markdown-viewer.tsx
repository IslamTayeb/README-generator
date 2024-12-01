"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  markdown: string;
}

export function MarkdownViewer({ markdown }: MarkdownViewerProps) {
  const components: Partial<Components> = {
    a: ({ children, ...props }) => (
      <a
        {...props}
        className="break-words overflow-wrap-anywhere inline-block max-w-full"
        style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          hyphens: 'auto'
        }}
      >
        {children}
      </a>
    ),
    code: ({ children, className }) => {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;

      return (
        <code
          className={`${isInline ? 'break-words overflow-wrap-anywhere' : ''} ${className || ''}`}
        >
          {children}
        </code>
      );
    }
  };

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
            hover:[&_pre::-webkit-scrollbar-thumb]:bg-primary/15

            [&_a]:break-words
            [&_a]:overflow-wrap-anywhere
            [&_a]:inline-block
            [&_a]:max-w-full

            [&_p]:break-words
            [&_p]:overflow-wrap-anywhere

            [&_code]:break-words
            [&_code]:overflow-wrap-anywhere
            [&_code]:whitespace-pre-wrap

            [&_pre_code]:whitespace-pre

            [&_li]:break-words
            [&_li]:overflow-wrap-anywhere

            before:[&_*]:break-before-auto
            after:[&_*]:break-after-auto

            [&_*]:break-words
            [&_*]:word-wrap-normal
            [&_*]:word-break-normal
            [&_*]:hyphens-auto"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
