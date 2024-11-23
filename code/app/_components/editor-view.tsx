'use client'

import React, { useState } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { MarkdownEditor } from "@/app/_components/markdown-editor"
import { MarkdownViewer } from "@/app/_components/markdown-viewer"
import { ChatWithGemini } from "@/app/_components/chat-with-gemini"

export function EditorView({ repoUrl }: { repoUrl: string }) {
  const [markdown, setMarkdown] = useState('')

  return (
    <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-4rem)]">
      <ResizablePanel defaultSize={50} minSize={30}>
        <MarkdownEditor value={markdown} onChange={setMarkdown} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50} minSize={30}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={60} minSize={30}>
            <MarkdownViewer markdown={markdown} />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={40} minSize={20}>
            <ChatWithGemini />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
