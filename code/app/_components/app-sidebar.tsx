import React from 'react'
import { Plus, History, User } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Project {
  id: string
  name: string
  url: string
  lastAccessed: string
}

interface AppSidebarProps {
  isAuthenticated: boolean
  projects: Project[]
  onNewProject: () => void
  onAuthenticate: () => void
}

export function AppSidebar({ isAuthenticated, projects, onNewProject, onAuthenticate }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="w-full justify-start gap-2 text-foreground bg-secondary hover:bg-secondary/80"
              onClick={onNewProject}
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {projects.map((project) => (
          <SidebarMenu key={project.id}>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button className="w-full text-left flex items-center gap-2 pl-6 text-foreground">
                  <History className="h-4 w-4" />
                  <span>{project.name}</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full justify-start gap-2 text-foreground">
                  <User className="h-4 w-4" />
                  <span>
                    {isAuthenticated ? "Account Settings" : "Sign In"}
                  </span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem>Sign Out</DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={onAuthenticate}>Sign In with GitHub</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
