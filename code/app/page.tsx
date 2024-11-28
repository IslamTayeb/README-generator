"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Github, Menu } from "lucide-react";
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

interface Project {
  id: string;
  name: string;
  url: string;
  lastAccessed: string;
}

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [repoUrl, setRepoUrl] = React.useState("");
  const [isEditorMode, setIsEditorMode] = React.useState(false);
  const [repositories, setRepositories] = React.useState<Project[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // GitHub Authentication Handler
  const handleGithubAuth = () => {
    window.location.href = "http://localhost:3001/auth/github/login"; // Redirect to backend for GitHub OAuth
  };

  // Fetch Repositories Handler
  const fetchRepositories = async () => {
    try {
      const response = await fetch("http://localhost:3001/auth/github/repos", {
        credentials: "include", // Important to include credentials (session cookies)
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
        credentials: "include", // Include cookies in request
      });

      if (response.ok) {
        setIsAuthenticated(true);
        fetchRepositories(); // Fetch repositories after successful authentication
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Verification failed", error);
    }
  };

  // Run authentication verification on component mount
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

  // JSX where you render the repositories (update to match):
  repositories.map((repo) => (
    <Button
      key={repo.id}
      className="w-full mb-2"
      onClick={() => handleNavigateToEditor(repo.url)}
    >
      {repo.name}
    </Button>
  ));

  return (
    <div className="flex w-full bg-background text-foreground">
      <SidebarProvider>
        <AppSidebar
          isAuthenticated={isAuthenticated}
          projects={repositories.length ? repositories : []}
          onNewProject={navigateToLandingPage}
          onAuthenticate={handleGithubAuth}
          onNavigateToEditor={handleNavigateToEditor}
          collapsed={isSidebarCollapsed}
        />

        <main className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
            <SidebarTrigger>
              <Menu className="h-6 w-6 text-foreground" />
            </SidebarTrigger>
            <h1 className="text-2xl font-bold text-primary">
              README.md Generator
            </h1>
            <div className="w-6" />
          </header>

          <AnimatePresence mode="wait">
            {!isEditorMode ? (
              <motion.div
                key="landing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-1 items-center justify-center px-6"
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
                className="flex-1"
              >
                <EditorView repoUrl={repoUrl} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </SidebarProvider>
    </div>
  );
}
