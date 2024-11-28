"use client";

import * as React from "react";
import { ChevronRight, Folder, File, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FileTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

interface FileTreeProps {
  files: FileTreeItem[];
  onNext: (selectedFiles: string[], selectedDirectories: string[]) => void;
  preCheckedFiles?: string[];
  onClose: () => void;
}

interface TreeNode {
  isFile: boolean;
  type: string;
  path: string;
  children: Record<string, TreeNode>;
}

const MAX_FILES = 20;

export function FileTree({
  files,
  onNext,
  preCheckedFiles = [],
  onClose,
}: FileTreeProps) {
  // Initialize selected files with pre-checked files
  const [selectedFiles, setSelectedFiles] = React.useState<Set<string>>(() => {
    console.log("Initializing selected files with:", preCheckedFiles);
    return new Set(preCheckedFiles);
  });

  // Initialize expanded folders to include parents of pre-selected files
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(
    () => {
      const expanded = new Set<string>();
      preCheckedFiles.forEach((filePath) => {
        const parts = filePath.split("/");
        let currentPath = "";
        for (let i = 0; i < parts.length - 1; i++) {
          currentPath += (currentPath ? "/" : "") + parts[i];
          expanded.add(currentPath);
        }
      });
      console.log("Initialized expanded folders:", expanded);
      return expanded;
    }
  );

  // Effect to handle preCheckedFiles updates
  React.useEffect(() => {
    if (preCheckedFiles.length > 0) {
      console.log("Updating selected files with:", preCheckedFiles);
      setSelectedFiles(new Set(preCheckedFiles));

      // Update expanded folders
      const parentFolders = new Set<string>();
      preCheckedFiles.forEach((filePath) => {
        const parts = filePath.split("/");
        let currentPath = "";
        for (let i = 0; i < parts.length - 1; i++) {
          currentPath += (currentPath ? "/" : "") + parts[i];
          parentFolders.add(currentPath);
        }
      });
      setExpandedFolders(parentFolders);
    }
  }, [preCheckedFiles]);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [isClosing, setIsClosing] = React.useState(false);
  const { toast } = useToast();

  // Convert flat file list to tree structure
  const createFileTree = (files: FileTreeItem[]): Record<string, TreeNode> => {
    const root: Record<string, TreeNode> = {};

    // First pass: Create directory nodes
    files
      .filter((file) => file.type === "tree")
      .forEach((file) => {
        const parts = file.path.split("/");
        let current = root;

        parts.forEach((part, index) => {
          if (!current[part]) {
            current[part] = {
              isFile: false,
              type: "tree",
              path: parts.slice(0, index + 1).join("/"),
              children: {},
            };
          }
          current = current[part].children;
        });
      });

    // Second pass: Add files to their directories
    files
      .filter((file) => file.type === "blob")
      .forEach((file) => {
        const parts = file.path.split("/");
        let current = root;

        // Handle files in root directory
        if (parts.length === 1) {
          current[parts[0]] = {
            isFile: true,
            type: file.type,
            path: file.path,
            children: {},
          };
          return;
        }

        // Handle files in subdirectories
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isLastPart = i === parts.length - 1;

          if (isLastPart) {
            current[part] = {
              isFile: true,
              type: file.type,
              path: file.path,
              children: {},
            };
          } else {
            if (!current[part]) {
              current[part] = {
                isFile: false,
                type: "tree",
                path: parts.slice(0, i + 1).join("/"),
                children: {},
              };
            }
            current = current[part].children;
          }
        }
      });

    return root;
  };

  const fileTree = React.useMemo(() => createFileTree(files), [files]);

  const handleCheckboxChange = (node: TreeNode, checked: boolean) => {
    const newSelection = new Set(selectedFiles);
    const updateSelection = (n: TreeNode) => {
      if (checked) {
        newSelection.add(n.path);
      } else {
        newSelection.delete(n.path);
      }
      if (!n.isFile) {
        Object.values(n.children).forEach(updateSelection);
      }
    };
    updateSelection(node);
    setSelectedFiles(newSelection);

    // Check if the number of selected files exceeds MAX_FILES
    const selectedCount = Array.from(newSelection).filter((path) => {
      const node = files.find((file) => file.path === path);
      return node && node.type === "blob";
    }).length;

    if (selectedCount > MAX_FILES) {
      toast({
        title: "Warning",
        description: `You've selected more than ${MAX_FILES} files. This may impact performance.`,
        variant: "destructive",
      });
    }
  };

  const getNodeState = (
    node: TreeNode
  ): "checked" | "unchecked" | "indeterminate" => {
    if (node.isFile) {
      return selectedFiles.has(node.path) ? "checked" : "unchecked";
    }

    const childStates = Object.values(node.children).map(getNodeState);
    const hasChecked = childStates.includes("checked");
    const hasUnchecked = childStates.includes("unchecked");
    const hasIndeterminate = childStates.includes("indeterminate");

    if (hasIndeterminate || (hasChecked && hasUnchecked)) {
      return "indeterminate";
    }

    return hasChecked ? "checked" : "unchecked";
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const filterTree = (node: TreeNode, term: string): boolean => {
    if (node.isFile) {
      return node.path.toLowerCase().includes(term.toLowerCase());
    }
    return Object.entries(node.children).some(([name, childNode]) =>
      filterTree(childNode, term)
    );
  };

  React.useEffect(() => {
    if (searchTerm) {
      const expandMatchingFolders = (node: TreeNode) => {
        if (node.isFile) {
          return node.path.toLowerCase().includes(searchTerm.toLowerCase());
        }
        const shouldExpand = Object.entries(node.children).some(
          ([name, childNode]) => expandMatchingFolders(childNode)
        );
        if (shouldExpand) {
          setExpandedFolders((prev) => new Set(prev).add(node.path));
        }
        return shouldExpand;
      };

      Object.values(fileTree).forEach(expandMatchingFolders);
    }
  }, [searchTerm, fileTree]);

  const renderTreeNode = React.useMemo(() => {
    const render = (node: TreeNode, name: string, level: number = 0) => {
      const isFolder = !node.isFile;
      const isExpanded = expandedFolders.has(node.path);
      const nodeState = getNodeState(node);

      if (searchTerm && !filterTree(node, searchTerm)) {
        return null;
      }

      return (
        <motion.div
          key={node.path}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <ScrollArea className="w-full" orientation="horizontal">
            <div
              className={cn(
                "flex items-center gap-2 py-1 px-2 rounded-sm group hover:bg-secondary/40 min-w-max",
                nodeState === "indeterminate" && "bg-secondary/20"
              )}
              style={{ paddingLeft: `${level * 20}px` }}
            >
              <div className="relative flex items-center justify-center">
                <Checkbox
                  checked={nodeState === "checked"}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(node, checked === true)
                  }
                  className={cn(
                    "rounded-sm border border-primary",
                    nodeState === "checked" &&
                      "bg-primary text-primary-foreground",
                    nodeState === "indeterminate" && "bg-transparent"
                  )}
                />
                {nodeState === "indeterminate" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-0.5 w-2/3 bg-primary rounded-full" />
                  </div>
                )}
              </div>

              {isFolder ? (
                <button
                  onClick={() => toggleFolder(node.path)}
                  className="flex items-center gap-2 text-sm"
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </motion.div>
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="truncate">{name}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-1 text-sm">
                  <File className="h-4 w-4 shrink-0" />
                  <span className="truncate">{name}</span>
                </div>
              )}
            </div>
          </ScrollArea>

          <AnimatePresence>
            {isFolder && isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="border-l ml-[21px] mt-1"
              >
                {Object.entries(node.children).map(([childName, childNode]) =>
                  render(childNode, childName, level + 1)
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    };
    return render;
  }, [
    expandedFolders,
    selectedFiles,
    searchTerm,
    handleCheckboxChange,
    toggleFolder,
  ]);

  const selectedCount = Array.from(selectedFiles).filter((path) => {
    const node = files.find((file) => file.path === path);
    return node && node.type === "blob";
  }).length;

  const handleNext = () => {
    setIsClosing(true);
    setTimeout(() => {
      const selectedFilesList = Array.from(selectedFiles).filter((path) => {
        const node = files.find((file) => file.path === path);
        return node && node.type === "blob";
      });
      const selectedDirectories = Array.from(selectedFiles).filter((path) => {
        const node = files.find((file) => file.path === path);
        return node && node.type !== "blob";
      });
      onNext(selectedFilesList, selectedDirectories);
      onClose();
    }, 300);
  };

  const handleBack = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <AnimatePresence>
      {!isClosing && (
        <motion.div
          key="landing"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full max-w-md border bg-card">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="font-semibold">Select Files for README</h2>
                <p className="text-sm text-muted-foreground">
                  Choose which files to include in the documentation
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="relative">
              <ScrollArea className="h-[400px] w-full">
                <motion.div
                  className="p-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {Object.entries(fileTree).map(([name, node]) =>
                    renderTreeNode(node, name)
                  )}
                </motion.div>
              </ScrollArea>
              <div className="absolute bottom-2 right-4 text-sm text-muted-foreground">
                {selectedCount} file{selectedCount !== 1 ? "s" : ""} selected
              </div>
            </div>
            <div className="p-4 border-t flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {selectedCount > MAX_FILES ? (
                  <span className="text-destructive">
                    Warning: {selectedCount - MAX_FILES} files over limit
                  </span>
                ) : (
                  <span>{MAX_FILES - selectedCount} files remaining</span>
                )}
              </p>
              <Button onClick={handleNext} disabled={selectedCount > MAX_FILES}>
                Next
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
