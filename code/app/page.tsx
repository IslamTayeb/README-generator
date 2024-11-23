'use client'

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Github, Menu } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { EditorView } from "@/app/_components/editor-view"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AppSidebar } from "@/app/_components/app-sidebar"

interface Project {
  id: string
  name: string
  url: string
  lastAccessed: string
}

const mockProjects: Project[] = [
  {
    id: "1",
    name: "project-alpha",
    url: "https://github.com/user/project-alpha",
    lastAccessed: "2024-01-15",
  },
  {
    id: "2",
    name: "project-beta",
    url: "https://github.com/user/project-beta",
    lastAccessed: "2024-01-14",
  },
  {
    id: "3",
    name: "project-gamma",
    url: "https://github.com/user/project-gamma",
    lastAccessed: "2024-01-13",
  },
]

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [repoUrl, setRepoUrl] = React.useState("")
  const [isEditorMode, setIsEditorMode] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (repoUrl) {
      console.log("Generating README for:", repoUrl)
      setIsEditorMode(true)
    } else {
      console.error("Repository URL is required.")
    }
  }

  const handleGithubAuth = () => {
    if (!isAuthenticated) {
      console.log("Authenticating with GitHub...")
      setIsAuthenticated(true)
    } else {
      console.log("User is already authenticated. Showing repository options...")
    }
  }

  const navigateToLandingPage = () => {
    setIsEditorMode(false)
    setRepoUrl("")
  }

  return (
    <SidebarProvider defaultCollapsed={isEditorMode}>
      <div className="flex w-full bg-background text-foreground">
        <AppSidebar
          isAuthenticated={isAuthenticated}
          projects={mockProjects}
          onNewProject={navigateToLandingPage}
          onAuthenticate={handleGithubAuth}
        />

        <main className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
            <SidebarTrigger>
              <Menu className="h-6 w-6 text-foreground" />
            </SidebarTrigger>
            <h1 className="text-2xl font-bold text-primary">README.md Generator</h1>
            <div className="w-6" /> {/* Placeholder for symmetry */}
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
                    <CardTitle className="text-center">Generate README</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Or
                          </span>
                        </div>
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
                              {isAuthenticated ? "Choose Repository" : "Authenticate with GitHub"}
                            </DialogTitle>
                          </DialogHeader>
                          {isAuthenticated ? (
                            <div className="py-4">
                              {/* Add repository selection UI here */}
                              <p>Repository selection UI goes here</p>
                            </div>
                          ) : (
                            <div className="py-4">
                              <Button onClick={handleGithubAuth} className="w-full bg-primary text-primary-foreground">
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
      </div>
    </SidebarProvider>
  )
}
