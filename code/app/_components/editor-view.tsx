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
import LoadingIndicator from "./editing/loading-indicator"

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

interface FileSelectionParams {
  selectedFiles: string[];
  selectedDirectories: string[];
  projectContext: string;
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
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [isComplete, setIsComplete] = useState(false);


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
      setLoadingMessages([
        "Connecting to repository...",
        "Fetching file structure...",
        "Analyzing repository contents..."
      ]);

      let messageIndex = 0;
      const messageInterval = setInterval(() => {
        setCurrentMessageIndex(prev => {
          messageIndex = (prev + 1) % loadingMessages.length;
          return messageIndex;
        });
      }, 3000);

      const encodedRepoUrl = encodeURIComponent(repoUrl);
      const response = await axios.get(
        `http://localhost:3001/api/github/fetch-tree?repoUrl=${encodedRepoUrl}`,
        {
          withCredentials: true,
          headers: { Accept: "application/json" },
        }
      );

      clearInterval(messageInterval);

      if (response.data.files && response.data.preSelectedFiles) {
        setFiles(response.data.files);
        setPreSelectedFiles(response.data.preSelectedFiles);
      }
    } catch (error) {
      console.error("Failed to fetch repository tree:", error);
    } finally {
      setLoading(false);
      setLoadingMessages([]);
      setCurrentMessageIndex(0);
    }
  };

  const handleFileSelection = async ({ selectedFiles, selectedDirectories, projectContext }: FileSelectionParams) => {
    try {
      setLoading(true);
      setTokenCount(0); // Reset token count
      const encodedRepoUrl = encodeURIComponent(repoUrl);

      setLoadingMessages(["Starting process..."]);
      setCurrentMessageIndex(0);

      const response = await axios.post(
        "http://localhost:3001/api/github/generate-readme",
        {
          repoUrl: encodedRepoUrl,
          selectedFiles,
          projectContext
        },
        {
          withCredentials: true,
          onDownloadProgress: (progressEvent) => {
            const content = progressEvent.event.target.responseText;
            const lines = content.split('\n').filter(Boolean);

            // Process all lines to get the latest state
            lines.forEach((line: string) => {  // Added type here
              try {
                const update = JSON.parse(line);
                if (update.status === 'complete') {
                  // Fade out animation
                  setTimeout(() => {
                    setMarkdown(update.readme);
                    setFullMarkdown(update.readme);
                    const extractedSections = extractSections(update.readme);
                    setSections(extractedSections);
                    if (extractedSections.length > 0) {
                      setActiveSection(extractedSections[0]);
                      setActiveSectionContent(extractedSections[0].markdown);
                    }
                    setShowFileTree(false);
                    setLoading(false);
                  }, 200); // Match the exit animation duration
                } else if (update.status === 'error') {
                  throw new Error(update.message);
                } else {
                  setLoadingMessages([update.message]);
                  if (update.tokenCount) {
                    setTokenCount(update.tokenCount);
                  }
                }
              } catch (e) {
                console.error('Error parsing update:', e);
              }
            });
          },
        }
      );
    } catch (error) {
      console.error("Failed to generate README:", error);
      setLoading(false);
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
        <LoadingIndicator
          messages={loadingMessages}
          currentIndex={currentMessageIndex}
          tokenCount={tokenCount}
          isComplete={isComplete}
        />
      )}      {showFileTree ? (
        <div className="flex-1 flex justify-center items-center p-4 overflow-auto">
          <FileTree
            files={files}
            preCheckedFiles={preSelectedFiles}
            onNext={handleFileSelection} // This will now work since types match
            onClose={() => setShowFileTree(false)}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[20%] overflow-auto bg-card border-r border-border
            [&::-webkit-scrollbar-track]:shadow-[inset_0_0_0_0_hsl(var(--primary)_/_0.00)]
            [&::-webkit-scrollbar]:w-[4px]
            [&::-webkit-scrollbar-thumb]:bg-secondary/25
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:transition-opacity
            [&::-webkit-scrollbar]:bg-card
            hover:[&::-webkit-scrollbar-thumb]:bg-secondary/50"
          >
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
