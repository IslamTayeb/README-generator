"use client"

import React, { useState, useEffect } from "react"
import { MarkdownEditor } from "@/app/_components/editing/markdown-editor"
import { MarkdownViewer } from "@/app/_components/editing/markdown-viewer"
import { ChatWithGemini } from "@/app/_components/editing/chat-with-gemini"
import { FileTree } from "@/app/_components/editing/file-tree"
import axios from "axios"

interface FileTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

interface EditorViewProps {
  repoUrl: string;
  markdown: string;
  setMarkdown: (markdown: string) => void;
}

export function EditorView({ repoUrl, markdown, setMarkdown }: EditorViewProps) {
  // Add this at the top of the component to debug props
  console.log("EditorView props:", { repoUrl, markdown, setMarkdown: !!setMarkdown });

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showFileTree, setShowFileTree] = useState(true);
  const [files, setFiles] = useState<FileTreeItem[]>([]);
  const [preSelectedFiles, setPreSelectedFiles] = useState<string[]>([]);

  const fetchRepositoryTree = async () => {
    try {
      setLoading(true)
      const encodedRepoUrl = encodeURIComponent(repoUrl)
      const response = await axios.get(
        `http://localhost:3001/api/github/fetch-tree?repoUrl=${encodedRepoUrl}`,
        {
          withCredentials: true,
          headers: {
            Accept: "application/json",
          },
        }
      )

      console.log("Received repository tree response:", response.data)

      if (response.data.files && response.data.preSelectedFiles) {
        setFiles(response.data.files)
        setPreSelectedFiles(response.data.preSelectedFiles)
      }
    } catch (error) {
      console.error("Failed to fetch repository tree:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (repoUrl) {
      fetchRepositoryTree()
    }
  }, [repoUrl])

  const handleFileSelection = async (
    selectedFiles: string[],
    selectedDirectories: string[]
  ) => {
    try {
      setLoading(true);
      const encodedRepoUrl = encodeURIComponent(repoUrl);
      console.log("Generating README for files:", selectedFiles);

      // Verify setMarkdown is a function before the axios call
      if (typeof setMarkdown !== 'function') {
        throw new Error('setMarkdown is not a function');
      }

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

      console.log("Generated README response:", response.data);

      if (response.data.readme) {
        console.log("Setting markdown content:", response.data.readme);
        setMarkdown(response.data.readme);
        setShowFileTree(false);
      } else {
        console.error("No README content in response");
      }
    } catch (error) {
      console.error("Failed to generate README:", error);
      // Add more detailed error logging
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  return (
    <div className="h-full flex flex-col">
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
        <div className="flex-1 flex justify-center items-center p-4 overflow-auto">
          <FileTree
            files={files}
            preCheckedFiles={preSelectedFiles}
            onNext={handleFileSelection}
            onClose={() => setShowFileTree(false)}
          />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 overflow-hidden">
          {/* Left side - Editor */}
          <div className="h-full overflow-hidden border-r border-border">
            <MarkdownEditor value={markdown} onChange={setMarkdown} />
          </div>

          {/* Right side - Preview and Chat */}
          <div className="h-full flex flex-col overflow-hidden">
            <div className="h-[60%] min-h-0 border-b border-border overflow-hidden">
              <MarkdownViewer markdown={markdown} />
            </div>
            <div className="h-[40%] min-h-0 overflow-hidden">
               <ChatWithGemini />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
