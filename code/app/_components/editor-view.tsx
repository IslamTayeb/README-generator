"use client"

import React, { useState, useEffect, useCallback } from "react"
import { MarkdownEditor } from "./editing/markdown-editor"
import { MarkdownViewer } from "./editing/markdown-viewer"
import { ChatWithGemini } from "./editing/chat-with-gemini"
import { FileTree } from "./editing/file-tree"
import { SectionsColumn } from "./sections/sections-column"
import axios from "axios"
import { debounce } from 'lodash';

interface FileTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

interface Section {
  slug: string;
  name: string;
  markdown: string;
  startLine: number;
  endLine: number;
}

interface EditorViewProps {
  repoUrl: string;
  markdown: string;
  setMarkdown: (markdown: string) => void;
}

export function EditorView({ repoUrl, markdown, setMarkdown }: EditorViewProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showFileTree, setShowFileTree] = useState(true);
  const [files, setFiles] = useState<FileTreeItem[]>([]);
  const [preSelectedFiles, setPreSelectedFiles] = useState<string[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [previewMarkdown, setPreviewMarkdown] = useState(markdown);

  const extractSections = (content: string): Section[] => {
    const lines = content.split('\n');
    const sections: Section[] = [];
    let currentSection: Section | null = null;

    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,2})\s+(.+)$/);

      if (headingMatch) {
        if (currentSection) {
          currentSection.endLine = index - 1;
          sections.push(currentSection);
        }

        const level = headingMatch[1].length;
        const title = headingMatch[2];
        const slug = `section-${title.toLowerCase().replace(/[^\w]+/g, '-')}`;

        currentSection = {
          slug,
          name: title,
          markdown: lines.slice(index).join('\n'),
          startLine: index,
          endLine: lines.length - 1,
        };
      }
    });

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  const updateMarkdownFromSections = (orderedSections: Section[]) => {
    const lines = markdown.split('\n');
    let newLines: string[] = [];

    orderedSections.forEach((section, index) => {
      const sectionLines = lines.slice(section.startLine, section.endLine + 1);
      newLines.push(...sectionLines);

      if (index < orderedSections.length - 1) {
        newLines.push('', '');
      }
    });

    setMarkdown(newLines.join('\n'));
  };

  const handleSectionsChange = (newSections: Section[], updatedMarkdown?: string) => {
    if (updatedMarkdown) {
      setMarkdown(updatedMarkdown);
      const extractedSections = extractSections(updatedMarkdown);
      setSections(extractedSections);
    } else {
      updateMarkdownFromSections(newSections);
      setSections(newSections);
    }
  };

  const updateSectionsFromMarkdown = () => {
    const extractedSections = extractSections(markdown);
    setSections(extractedSections);
  };

  const debouncedSetPreview = useCallback(
    debounce((value: string) => {
      setPreviewMarkdown(value);
    }, 500),
    []
  );

  const debouncedCheckHeadings = useCallback(
    debounce((value: string) => {
      const currentHeadings = sections.map(s => s.name);
      const lines = value.split('\n');
      const newHeadings = lines
        .filter(line => line.match(/^(#{1,2})\s+(.+)$/))
        .map(line => line.match(/^(#{1,2})\s+(.+)$/)![2]);

      if (JSON.stringify(currentHeadings) !== JSON.stringify(newHeadings)) {
        const extractedSections = extractSections(value);
        setSections(extractedSections);
      }
    }, 500),
    [sections]
  );

  const handleMarkdownChange = (newValue: string) => {
    setMarkdown(newValue);
    debouncedSetPreview(newValue);
    debouncedCheckHeadings(newValue);
  };

  useEffect(() => {
    return () => {
      debouncedSetPreview.cancel();
      debouncedCheckHeadings.cancel();
    };
  }, [debouncedSetPreview, debouncedCheckHeadings]);

  useEffect(() => {
    if (markdown && sections.length === 0) {
      updateSectionsFromMarkdown();
    }
  }, [showFileTree]);

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
        const extractedSections = extractSections(response.data.readme);
        setSections(extractedSections);
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
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[20%] overflow-auto !block">
            <SectionsColumn
              sections={sections}
              onSectionsChange={handleSectionsChange}
              repoUrl={repoUrl}
              currentMarkdown={markdown}
            />
          </div>
          <div className="w-[40%] h-full overflow-hidden border-r border-border">
            <MarkdownEditor
              value={markdown}
              onChange={handleMarkdownChange}
            />
          </div>
          <div className="w-[40%] h-full flex flex-col overflow-hidden">
            <div className="h-[60%] min-h-0 border-b border-border overflow-hidden">
              <MarkdownViewer markdown={previewMarkdown} />
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
