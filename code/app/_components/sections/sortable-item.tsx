"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import RenameDialog from "./rename-dialog";

export interface Section {
  slug: string;
  name: string;
  markdown: string;
  startLine: number;
  endLine: number;
}

interface SortableItemProps {
  section: Section;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
}

const SortableItem = ({
  section,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.slug });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center bg-secondary rounded-md hover:bg-secondary/80",
        isActive && "ring-2 ring-primary",
        isDragging && "opacity-50"
      )}
    >
      <button
        className="flex-1 px-4 py-2 text-left focus:outline-none min-w-0"
        onClick={onSelect}
      >
        <span className="block truncate text-sm">{section.name}</span>
      </button>
      <div className="flex-none flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <RenameDialog
              currentName={section.name}
              onRename={onRename}
            >
              <DropdownMenuItem>
                Rename
              </DropdownMenuItem>
            </RenameDialog>
            <DropdownMenuItem
              className="text-destructive"
              onClick={onDelete}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="cursor-move p-1.5" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </div>
      </div>
    </li>
  );
};

export default SortableItem;
