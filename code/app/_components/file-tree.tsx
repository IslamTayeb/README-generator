// TODO: (1) Add a file number counter in the bottom right, (2) Make a horizontal/gray tick for when SOME of the components are selected within a parent, (3) Make it prompted before any backend processing, (3.1) Consider that you might need to make a new backend route that ONLY gets in the tree, because there will probably be an issue with the fact that you're fetching the code AND using gemini within the same route. This will be tough because of the "payload too big" error that you used to get.

"use client";

import * as React from "react";
import { ChevronRight, File, Folder } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

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
  onSelectionChange: (selectedFiles: string[]) => void;
}

interface TreeNode {
  isFile: boolean;
  type: string;
  path: string;
  children: Record<string, TreeNode>;
}

export function FileTree({ files, onSelectionChange }: FileTreeProps) {
  const [selectedFiles, setSelectedFiles] = React.useState<Set<string>>(
    new Set()
  );
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(
    new Set()
  );

  // Convert flat file list to tree structure
  const createFileTree = (files: FileTreeItem[]): Record<string, TreeNode> => {
    const root: Record<string, TreeNode> = {};

    files.forEach((file) => {
      const parts = file.path.split("/");
      let current = root;

      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            isFile: index === parts.length - 1,
            type: file.type,
            path: parts.slice(0, index + 1).join("/"),
            children: {},
          };
        }
        current = current[part].children;
      });
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
    onSelectionChange(Array.from(newSelection));
  };

  const isNodeChecked = (node: TreeNode): boolean => {
    if (node.isFile) {
      return selectedFiles.has(node.path);
    }
    return Object.values(node.children).every(isNodeChecked);
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

  const renderTreeNode = (node: TreeNode, name: string, level: number = 0) => {
    const isFolder = !node.isFile;
    const isExpanded = expandedFolders.has(node.path);
    const isChecked = isNodeChecked(node);

    return (
      <motion.div
        key={node.path}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        style={{ paddingLeft: `${level * 20}px` }}
      >
        <div className="flex items-center gap-2 py-1 px-2 rounded-sm group hover:bg-secondary/40">
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) =>
              handleCheckboxChange(node, checked === true)
            }
            className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />

          {isFolder ? (
            <button
              onClick={() => toggleFolder(node.path)}
              className="flex items-center gap-2 flex-1 text-sm"
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
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

        <AnimatePresence>
          {isFolder && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l ml-[21px] mt-1"
            >
              {Object.entries(node.children).map(([childName, childNode]) =>
                renderTreeNode(childNode, childName, level + 1)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <Card className="w-full max-w-md border bg-card">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Select Files for README</h2>
        <p className="text-sm text-muted-foreground">
          Choose which files to include in the documentation
        </p>
      </div>
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
    </Card>
  );
}


// SAMPLE WORK FROM V0.DEV

// "use client"

// import { FileTree } from "@/components/file-tree"
// import { motion } from "framer-motion"

// export default function Page() {
//   // Sample data based on the provided GitHub API response
//   const sampleFiles = [
//     { path: ".gitignore", mode: "100644", type: "blob", sha: "abcdef1", size: 374, url: "https://api.github.com/repos/example/example/git/blobs/abcdef1" },
//     { path: ".travis.yml", mode: "100644", type: "blob", sha: "abcdef2", size: 543, url: "https://api.github.com/repos/example/example/git/blobs/abcdef2" },
//     { path: "LICENSE", mode: "100644", type: "blob", sha: "abcdef3", size: 1075, url: "https://api.github.com/repos/example/example/git/blobs/abcdef3" },
//     { path: "README.md", mode: "100644", type: "blob", sha: "abcdef4", size: 2514, url: "https://api.github.com/repos/example/example/git/blobs/abcdef4" },
//     { path: "package.json", mode: "100644", type: "blob", sha: "abcdef5", size: 1240, url: "https://api.github.com/repos/example/example/git/blobs/abcdef5" },
//     { path: "src/index.js", mode: "100644", type: "blob", sha: "abcdef6", size: 1532, url: "https://api.github.com/repos/example/example/git/blobs/abcdef6" },
//     { path: "src/components/Header.js", mode: "100644", type: "blob", sha: "abcdef7", size: 743, url: "https://api.github.com/repos/example/example/git/blobs/abcdef7" },
//     { path: "src/components/Footer.js", mode: "100644", type: "blob", sha: "abcdef8", size: 658, url: "https://api.github.com/repos/example/example/git/blobs/abcdef8" },
//     { path: "src/components/Navigation.js", mode: "100644", type: "blob", sha: "abcdef9", size: 1247, url: "https://api.github.com/repos/example/example/git/blobs/abcdef9" },
//     { path: "src/pages/Home.js", mode: "100644", type: "blob", sha: "abcdef10", size: 2341, url: "https://api.github.com/repos/example/example/git/blobs/abcdef10" },
//     { path: "src/pages/About.js", mode: "100644", type: "blob", sha: "abcdef11", size: 1654, url: "https://api.github.com/repos/example/example/git/blobs/abcdef11" },
//     { path: "src/pages/Contact.js", mode: "100644", type: "blob", sha: "abcdef12", size: 1892, url: "https://api.github.com/repos/example/example/git/blobs/abcdef12" },
//     { path: "src/styles/main.css", mode: "100644", type: "blob", sha: "abcdef13", size: 3267, url: "https://api.github.com/repos/example/example/git/blobs/abcdef13" },
//     { path: "src/styles/components.css", mode: "100644", type: "blob", sha: "abcdef14", size: 2876, url: "https://api.github.com/repos/example/example/git/blobs/abcdef14" },
//     { path: "src/utils/helpers.js", mode: "100644", type: "blob", sha: "abcdef15", size: 1543, url: "https://api.github.com/repos/example/example/git/blobs/abcdef15" },
//     { path: "src/utils/api.js", mode: "100644", type: "blob", sha: "abcdef16", size: 2187, url: "https://api.github.com/repos/example/example/git/blobs/abcdef16" },
//     { path: "public/index.html", mode: "100644", type: "blob", sha: "abcdef17", size: 1024, url: "https://api.github.com/repos/example/example/git/blobs/abcdef17" },
//     { path: "public/favicon.ico", mode: "100644", type: "blob", sha: "abcdef18", size: 4286, url: "https://api.github.com/repos/example/example/git/blobs/abcdef18" },
//     { path: "public/images/logo.png", mode: "100644", type: "blob", sha: "abcdef19", size: 25690, url: "https://api.github.com/repos/example/example/git/blobs/abcdef19" },
//     { path: "public/images/banner.jpg", mode: "100644", type: "blob", sha: "abcdef20", size: 256904, url: "https://api.github.com/repos/example/example/git/blobs/abcdef20" },
//     { path: "tests/unit/helpers.test.js", mode: "100644", type: "blob", sha: "abcdef21", size: 1876, url: "https://api.github.com/repos/example/example/git/blobs/abcdef21" },
//     { path: "tests/integration/api.test.js", mode: "100644", type: "blob", sha: "abcdef22", size: 2543, url: "https://api.github.com/repos/example/example/git/blobs/abcdef22" },
//     { path: "docs/API.md", mode: "100644", type: "blob", sha: "abcdef23", size: 4521, url: "https://api.github.com/repos/example/example/git/blobs/abcdef23" },
//     { path: "docs/CONTRIBUTING.md", mode: "100644", type: "blob", sha: "abcdef24", size: 2765, url: "https://api.github.com/repos/example/example/git/blobs/abcdef24" },
//     { path: ".github/ISSUE_TEMPLATE.md", mode: "100644", type: "blob", sha: "abcdef25", size: 1543, url: "https://api.github.com/repos/example/example/git/blobs/abcdef25" },
//     { path: ".github/PULL_REQUEST_TEMPLATE.md", mode: "100644", type: "blob", sha: "abcdef26", size: 1876, url: "https://api.github.com/repos/example/example/git/blobs/abcdef26" },
//     { path: "scripts/build.sh", mode: "100755", type: "blob", sha: "abcdef27", size: 567, url: "https://api.github.com/repos/example/example/git/blobs/abcdef27" },
//     { path: "scripts/deploy.sh", mode: "100755", type: "blob", sha: "abcdef28", size: 892, url: "https://api.github.com/repos/example/example/git/blobs/abcdef28" },
//     { path: "config/webpack.config.js", mode: "100644", type: "blob", sha: "abcdef29", size: 4765, url: "https://api.github.com/repos/example/example/git/blobs/abcdef29" },
//     { path: "config/jest.config.js", mode: "100644", type: "blob", sha: "abcdef30", size: 1234, url: "https://api.github.com/repos/example/example/git/blobs/abcdef30" }
//   ]

//   return (
//     <motion.div
//       className="flex items-center justify-center min-h-screen bg-background p-4"
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       transition={{ duration: 0.5 }}
//     >
//       <FileTree
//         files={sampleFiles}
//         onSelectionChange={(selectedFiles) => {
//           console.log("Selected files:", selectedFiles)
//         }}
//       />
//     </motion.div>
//   )
// }

// SAMPLE WORK FROM V0.DEV
