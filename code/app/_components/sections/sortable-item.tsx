import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, RotateCcw } from 'lucide-react'

interface SortableItemProps {
  id: string
  section: any
  focusedSectionSlug: string | null
  setFocusedSectionSlug: (slug: string) => void
  onDeleteSection: (slug: string) => void
  onResetSection: (slug: string) => void
}

export const SortableItem: React.FC<SortableItemProps> = ({
  id,
  section,
  focusedSectionSlug,
  setFocusedSectionSlug,
  onDeleteSection,
  onResetSection,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`relative flex items-center py-2 px-3 bg-secondary rounded-md ${
        focusedSectionSlug === id ? 'ring-2 ring-primary' : ''
      }`}
    >
      <button
        className="flex-grow text-left focus:outline-none"
        onClick={() => setFocusedSectionSlug(id)}
      >
        {section.name}
      </button>
      <div className="flex items-center space-x-2">
        <button
          className="p-1 hover:bg-background rounded-md focus:outline-none"
          onClick={() => onResetSection(id)}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          className="p-1 hover:bg-background rounded-md focus:outline-none"
          onClick={() => onDeleteSection(id)}
        >
          <X className="w-4 h-4" />
        </button>
        <div {...listeners} className="cursor-move">
          <GripVertical className="w-4 h-4" />
        </div>
      </div>
    </li>
  )
}
