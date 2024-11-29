"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Github, Menu, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { EditorView } from "@/app/_components/editor-view";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppSidebar } from "@/app/_components/app-sidebar";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  url: string;
  lastAccessed: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [repoUrl, setRepoUrl] = React.useState("");
  const [isEditorMode, setIsEditorMode] = React.useState(false);
  const [repositories, setRepositories] = React.useState<Project[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [markdown, setMarkdown] = React.useState("");

  // GitHub Authentication Handler
  const handleGithubAuth = () => {
    window.location.href = "http://localhost:3001/auth/github/login";
  };

  // Fetch Repositories Handler
  const fetchRepositories = async () => {
    try {
      const response = await fetch("http://localhost:3001/auth/github/repos", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const repos = data.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          url: repo.html_url,
          lastAccessed: new Date().toISOString(),
        }));
        setRepositories(repos);
      } else {
        console.error("Failed to fetch repositories");
      }
    } catch (error) {
      console.error("Failed to fetch repositories", error);
    }
  };

  // Verify Authentication
  const verifyAuthentication = async () => {
    try {
      const response = await fetch("http://localhost:3001/auth/github/verify", {
        credentials: "include",
      });

      if (response.ok) {
        setIsAuthenticated(true);
        fetchRepositories();
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Verification failed", error);
    }
  };

  React.useEffect(() => {
    verifyAuthentication();
  }, []);

  const navigateToLandingPage = () => {
    setIsEditorMode(false);
    setRepoUrl("");
  };

  const handleNavigateToEditor = (repoUrl: string) => {
    setRepoUrl(repoUrl);
    setIsEditorMode(true);
    setIsSidebarCollapsed(true);
  };

  const handleSubmit = async () => {
    console.log("Submit clicked");
    console.log("Current markdown content:", markdown);

    if (!markdown) {
      toast({
        title: "Error",
        description: "No content to submit. Please generate or write some content first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Submitting to GitHub...", { repoUrl, contentLength: markdown.length });
      const response = await fetch('http://localhost:3001/api/github/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          repoUrl: repoUrl,
          content: markdown
        }),
      });

      console.log("Submit response status:", response.status);
      const data = await response.json();
      console.log("Submit response data:", data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update README');
      }

      toast({
        title: "Success",
        description: "README.md has been successfully updated on GitHub.",
      });
    } catch (error) {
      console.error("Error submitting README:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update README.md. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full h-screen bg-background text-foreground overflow-hidden">
      <SidebarProvider>
        <AppSidebar
          isAuthenticated={isAuthenticated}
          projects={repositories.length ? repositories : []}
          onNewProject={navigateToLandingPage}
          onAuthenticate={handleGithubAuth}
          onNavigateToEditor={handleNavigateToEditor}
          collapsed={isSidebarCollapsed}
        />

        <main className="flex flex-col flex-1 h-full overflow-hidden">
          <header className="flex items-center border-b border-border px-6 py-4 bg-card">
            <div className="flex-1 flex items-center">
              <SidebarTrigger>
                <Menu className="h-6 w-6 text-foreground" />
              </SidebarTrigger>
              <AnimatePresence>
                {isEditorMode && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="ml-6"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={navigateToLandingPage}
                      className="gap-2 h-8"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to File Selection
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <h1 className="text-2xl font-bold text-primary">
              README.md Generator
            </h1>

            <div className="flex-1 flex justify-end">
              <AnimatePresence>
                {isEditorMode && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="gap-2 h-8"
                    >
                      <Github className="h-4 w-4" />
                      {isSubmitting ? "Submitting..." : "Submit to GitHub"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {!isEditorMode ? (
                <motion.div
                  key="landing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex h-full items-center justify-center px-6 overflow-auto"
                >
                  <Card className="w-full max-w-md">
                    <CardHeader>
                      <CardTitle className="text-center">
                        Generate README
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          setIsEditorMode(true);
                        }}
                        className="space-y-4"
                      >
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="Paste URL of GitHub repository..."
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            className="pr-10 bg-input text-foreground"
                          />
                          <ArrowRight className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full gap-2 bg-secondary text-secondary-foreground"
                            >
                              <Github className="h-4 w-4" />
                              {isAuthenticated
                                ? "Choose Repository"
                                : "Authenticate with GitHub"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                {isAuthenticated
                                  ? "Choose Repository"
                                  : "Authenticate with GitHub"}
                              </DialogTitle>
                            </DialogHeader>
                            {isAuthenticated ? (
                              <div className="py-4">
                                {repositories.length ? (
                                  repositories.map((repo) => (
                                    <Button
                                      key={repo.id}
                                      className="w-full mb-2"
                                      onClick={() =>
                                        handleNavigateToEditor(repo.url)
                                      }
                                    >
                                      {repo.name}
                                    </Button>
                                  ))
                                ) : (
                                  <p>Loading repositories...</p>
                                )}
                              </div>
                            ) : (
                              <div className="py-4">
                                <Button
                                  onClick={handleGithubAuth}
                                  className="w-full bg-primary text-primary-foreground"
                                >
                                  Authenticate with GitHub
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <EditorView
                    repoUrl={repoUrl}
                    markdown={markdown}
                    setMarkdown={setMarkdown}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
