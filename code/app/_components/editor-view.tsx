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

  // Function to load the repository and generate README
  const loadRepositoryAndGenerateReadme = async () => {
    try {
      console.log("Starting repository and README loading process...");
      setLoading(true);
      setProgress(0);

      // Step: Fetch code from repository and generate README in one go
      const encodedRepoUrl = encodeURIComponent(repoUrl);
      console.log(`Fetching repository and generating README from URL: ${repoUrl}`);

      const response = await axios.post(
        "http://localhost:3001/api/github/fetch-and-generate-readme",
        {
          repoUrl: encodedRepoUrl,
        },
        {
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

      console.log("README generated successfully:", response.data);

      // Check if the response contains the generated README content
      if (!response.data || !response.data.readme) {
        console.warn("Unexpected response format. Expected readme in response.");
        throw new Error("Invalid README generation response format");
      }

      // Set the generated README content to the markdown editor
      const readmeContent = response.data.readme;
      setMarkdown(readmeContent);
    } catch (error) {
      console.error("Failed to load repository or generate README:", error);
    } finally {
      setLoading(false);
      setProgress(100); // Set progress to complete when done
    }
  };

  // Load the repository and generate README when the component mounts or the repoUrl changes
  useEffect(() => {
    if (repoUrl) {
      loadRepositoryAndGenerateReadme();
    }
  }, [repoUrl]);

  return (
    <>
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="flex flex-col items-center space-y-4">
            <h2 className="text-xl font-bold text-white">Loading README...</h2>
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
