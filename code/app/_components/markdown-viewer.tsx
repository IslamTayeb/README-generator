'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'

interface MarkdownViewerProps {
  markdown: string
}

export function MarkdownViewer({ markdown }: MarkdownViewerProps) {
  return (
    <div className="flex flex-col h-full bg-card">
      <h2 className="text-xl font-bold p-4 text-foreground bg-card border-b">Github Markdown Viewer</h2>
      <div className="flex-grow overflow-auto p-4">
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
