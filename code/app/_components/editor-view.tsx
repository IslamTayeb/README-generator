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
import { FileTree } from "@/app/_components/file-tree";
import axios from "axios";

interface FileTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

export function EditorView({ repoUrl }: { repoUrl: string }) {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showFileTree, setShowFileTree] = useState(true);
  const [files, setFiles] = useState<FileTreeItem[]>([]);
  const [preSelectedFiles, setPreSelectedFiles] = useState<string[]>([]);

  const fetchRepositoryTree = async () => {
    try {
      setLoading(true);
      const encodedRepoUrl = encodeURIComponent(repoUrl);
      const response = await axios.get(
        `http://localhost:3001/api/github/fetch-tree?repoUrl=${encodedRepoUrl}`,
        {
          withCredentials: true,
          headers: {
            Accept: "application/json",
          },
        }
      );

      console.log("Received repository tree response:", response.data);

      if (response.data.files && response.data.preSelectedFiles) {
        setFiles(response.data.files);
        setPreSelectedFiles(response.data.preSelectedFiles);
      }
    } catch (error) {
      console.error("Failed to fetch repository tree:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repoUrl) {
      fetchRepositoryTree();
    }
  }, [repoUrl]);

  const handleFileSelection = async (
    selectedFiles: string[],
    selectedDirectories: string[]
  ) => {
    try {
      setLoading(true);
      const encodedRepoUrl = encodeURIComponent(repoUrl);
      const response = await axios.post(
        "http://localhost:3001/api/github/generate-readme",
        {
          repoUrl: encodedRepoUrl,
          selectedFiles,
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

      if (response.data.readme) {
        setMarkdown(response.data.readme);
        setShowFileTree(false);
      }
    } catch (error) {
      console.error("Failed to generate README:", error);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  useEffect(() => {
    if (repoUrl) {
      fetchRepositoryTree();
    }
  }, [repoUrl]);

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="flex flex-col items-center space-y-4">
            <h2 className="text-xl font-bold text-white">
              {showFileTree ? "Loading Files..." : "Generating README..."}
            </h2>
            <progress
              value={progress}
              max="100"
              className="w-64 h-2 bg-gray-300 rounded"
            ></progress>
            <p className="text-white">{progress}%</p>
          </div>
        </div>
      )}

      {showFileTree ? (
        <div className="flex justify-center items-center min-h-screen p-4">
          <FileTree
            files={files}
            preCheckedFiles={preSelectedFiles}
            onNext={handleFileSelection}
            onClose={() => setShowFileTree(false)}
          />
        </div>
      ) : (
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
      )}
    </>
  );
}
