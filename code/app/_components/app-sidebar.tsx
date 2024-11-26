import React from "react";
import { Plus, History, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface Project {
  id: string;
  name: string;
  url: string;
  lastAccessed: string;
}

interface AppSidebarProps {
  isAuthenticated: boolean;
  projects: Project[];
  onNewProject: () => void;
  onAuthenticate: () => void;
  onNavigateToEditor: (repoUrl: string) => void;
}

export function AppSidebar({
  isAuthenticated,
  projects,
  onNewProject,
  onAuthenticate,
  onNavigateToEditor,
}: AppSidebarProps) {
  return (
    <Sidebar className="bg-card">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="w-full justify-start gap-2 text-foreground border hover:bg-secondary/40"
              onClick={onNewProject}
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <Separator className="w-11/12 my-1.5 mb-3.5 mx-auto" />

      <SidebarContent className="px-2">
        <span className="text-[10px] uppercase font-bold text-primary opacity-50">
          Past Projects
        </span>
        {projects.map((project) => (
          <SidebarMenu key={project.id}>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button
                  className="w-full justify-start gap-2 text-foreground bg-secondary hover:bg-secondary/75"
                  onClick={() => onNavigateToEditor(project.url)}
                >
                  <History className="h-4 w-4" />
                  <span className="px-[0.25em]">{project.name}</span>
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
                <SidebarMenuButton className="w-full justify-start gap-2 text-foreground hover:bg-background">
                  <User className="h-4 w-4" />
                  <span>
                    {isAuthenticated ? "Account Settings" : "Sign In"}
                  </span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem>Sign Out</DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={onAuthenticate}>
                    Sign In with GitHub
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}