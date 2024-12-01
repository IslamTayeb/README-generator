"use client"

import React, { useState, useEffect, useCallback } from "react"
import { MarkdownEditor } from "./editing/markdown-editor"
import { MarkdownViewer } from "./editing/markdown-viewer"
import { ChatWithGemini } from "./editing/chat-with-gemini"
import { FileTree } from "./editing/file-tree"
import { SectionsColumn } from "./sections/sections-column"
import axios from "axios"
import { debounce } from 'lodash';
import { editor } from "monaco-editor"

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
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [activeSectionContent, setActiveSectionContent] = useState('');
  const [fullMarkdown, setFullMarkdown] = useState(markdown);
  const editorRef = React.useRef<editor.IStandaloneCodeEditor | null>(null);

  const extractSections = (content: string): Section[] => {
    const lines = content.split('\n');
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let inCodeBlock = false;

    const isActualHeading = (line: string, prevLine: string | undefined) => {
      const headingMatch = line.match(/^(#{1,2})\s+(.+)$/);
      if (!headingMatch) return false;
      if (inCodeBlock) return false;
      const commonListWords = /^#{1,2}\s+(or|and|vs|versus)$/i;
      if (commonListWords.test(line)) return false;
      if (prevLine !== undefined && prevLine.trim() !== '') return false;
      return true;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prevLine = i > 0 ? lines[i - 1] : undefined;

      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
      }

      if (isActualHeading(line, prevLine)) {
        if (currentSection) {
          currentSection.markdown = lines.slice(currentSection.startLine, i).join('\n');
          currentSection.endLine = i - 1;
          sections.push(currentSection);
        }

        const [, , title] = line.match(/^(#{1,2})\s+(.+)$/)!;
        currentSection = {
          slug: `section-${title.toLowerCase().replace(/[^\w]+/g, '-')}`,
          name: title,
          markdown: '',
          startLine: i,
          endLine: lines.length - 1,
        };
      }
    }

    if (currentSection) {
      currentSection.markdown = lines.slice(currentSection.startLine).join('\n');
      currentSection.endLine = lines.length - 1;
      sections.push(currentSection);
    }

    return sections;
  };

  const debouncedUpdateSection = useCallback(
    debounce((newContent: string) => {
      if (activeSection) {
        const updatedSections = sections.map(section => {
          if (section.slug === activeSection.slug) {
            return {
              ...section,
              markdown: newContent
            };
          }
          return section;
        });

        const newFullMarkdown = updatedSections.map(s => s.markdown).join('\n\n');
        setFullMarkdown(newFullMarkdown);
        setMarkdown(newFullMarkdown);
        setSections(updatedSections);
      }
    }, 300),
    [activeSection, sections, setMarkdown]
  );

  const handleSectionSelect = (section: Section) => {
    setActiveSection(section);
    setActiveSectionContent(section.markdown);
  };

  const handleMarkdownChange = (newValue: string) => {
    setActiveSectionContent(newValue);
    debouncedUpdateSection(newValue);
  };

  const handleSectionsChange = (newSections: Section[], updatedMarkdown?: string) => {
    if (updatedMarkdown) {
      setFullMarkdown(updatedMarkdown);
      setMarkdown(updatedMarkdown);
      const extractedSections = extractSections(updatedMarkdown);
      setSections(extractedSections);
    } else {
      const newFullMarkdown = newSections.map(section => section.markdown).join('\n\n');
      setFullMarkdown(newFullMarkdown);
      setMarkdown(newFullMarkdown);
      setSections(newSections);
    }
  };

  const fetchRepositoryTree = async () => {
    try {
      setLoading(true);
      const encodedRepoUrl = encodeURIComponent(repoUrl);
      const response = await axios.get(
        `http://localhost:3001/api/github/fetch-tree?repoUrl=${encodedRepoUrl}`,
        {
          withCredentials: true,
          headers: { Accept: "application/json" },
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

  const handleFileSelection = async (selectedFiles: string[], selectedDirectories: string[]) => {
    try {
      setLoading(true);
      const encodedRepoUrl = encodeURIComponent(repoUrl);
      const response = await axios.post(
        "http://localhost:3001/api/github/generate-readme",
        { repoUrl: encodedRepoUrl, selectedFiles },
        {
          withCredentials: true,
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
            }
          },
        }
      );

      if (response.data.readme) {
        const newMarkdown = response.data.readme;
        setMarkdown(newMarkdown);
        setFullMarkdown(newMarkdown);
        const extractedSections = extractSections(newMarkdown);
        setSections(extractedSections);
        if (extractedSections.length > 0) {
          setActiveSection(extractedSections[0]);
          setActiveSectionContent(extractedSections[0].markdown);
        }
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

  useEffect(() => {
    if (markdown && sections.length === 0) {
      const extractedSections = extractSections(markdown);
      setSections(extractedSections);
      setFullMarkdown(markdown);
      if (extractedSections.length > 0) {
        setActiveSection(extractedSections[0]);
        setActiveSectionContent(extractedSections[0].markdown);
      }
    }
  }, [markdown]);

  return (
    <div className="h-full flex flex-col">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="flex flex-col items-center space-y-4">
            <h2 className="text-xl font-bold text-white">
              {showFileTree ? "Loading Files..." : "Generating README..."}
            </h2>
            <progress value={progress} max="100" className="w-64 h-2 bg-gray-300 rounded" />
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
              activeSection={activeSection}
              onSectionSelect={handleSectionSelect}
              onSectionsChange={handleSectionsChange}
              repoUrl={repoUrl}
              currentMarkdown={fullMarkdown}
            />
          </div>
          <div className="w-[40%] h-full overflow-hidden border-r border-border">
            <MarkdownEditor
              value={activeSectionContent}
              onChange={handleMarkdownChange}
              editorRef={editorRef}
            />
          </div>
          <div className="w-[40%] h-full flex flex-col overflow-hidden">
            <div className="h-[60%] min-h-0 border-b border-border overflow-hidden">
              <MarkdownViewer markdown={fullMarkdown} />
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
