"use client";

import React, { useState, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { MarkdownEditor } from "@/app/_components/markdown-editor";
import { MarkdownViewer } from "@/app/_components/markdown-viewer";
import { ChatWithGemini } from "@/app/_components/chat-with-gemini";
import axios from "axios";

export function EditorView({ repoUrl }: { repoUrl: string }) {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // Progress in percentage

  const loadRepository = async () => {
    try {
      setLoading(true);
      setProgress(0);

      // Properly encode the URL before sending to the backend
      const encodedRepoUrl = encodeURIComponent(repoUrl);

      const response = await axios.get(
        "http://localhost:3001/api/github/fetch-code",
        {
          params: { repoUrl: encodedRepoUrl },
          withCredentials: true,
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentage = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(percentage);
            }
          },
        }
      );

      const allFiles = response.data;

      // Check if allFiles is indeed an array
      if (!Array.isArray(allFiles)) {
        console.warn("Expected allFiles to be an array, but got:", allFiles);
        throw new Error("Unexpected response format");
      }

      // Combine all file contents into markdown format
      const combinedContent = allFiles
        .map(
          (file: { filePath: string; content: string }) =>
            `## ${file.filePath}\n\n\`\`\`\n${file.content}\n\`\`\`\n`
        )
        .join("\n\n");

      setMarkdown(combinedContent);
    } catch (error) {
      console.error("Failed to load repository:", error);
    } finally {
      setLoading(false);
      setProgress(100); // Set progress to complete when done
    }
  };

  // Load the repository when the component mounts or the repoUrl changes
  useEffect(() => {
    if (repoUrl) {
      loadRepository();
    }
  }, [repoUrl]);

  return (
    <>
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="flex flex-col items-center space-y-4">
            <h2 className="text-xl font-bold text-white">Loading Repository...</h2>
            <progress value={progress} max="100" className="w-64 h-2 bg-gray-300 rounded"></progress>
            <p className="text-white">{progress}%</p>
          </div>
        </div>
      )}

      <ResizablePanelGroup
        direction="horizontal"
        className="h-[calc(100vh-4rem)]"
      >
        <ResizablePanel defaultSize={50} minSize={30}>
          {/* Pass the repoUrl prop to MarkdownEditor */}
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
    </>
  );
}
