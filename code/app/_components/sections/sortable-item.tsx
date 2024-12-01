import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreVertical } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface SortableItemProps {
  id: string
  section: {
    name: string
    slug: string
  }
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

export const SortableItem: React.FC<SortableItemProps> = ({
  id,
  section,
  isActive,
  onSelect,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
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
            <DropdownMenuItem
              className="text-destructive"
              onClick={onDelete}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div {...listeners} className="cursor-move p-1.5">
          <GripVertical className="h-4 w-4" />
        </div>
      </div>
    </li>
  )
}
