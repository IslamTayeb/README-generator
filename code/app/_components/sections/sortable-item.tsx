import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'

interface SortableItemProps {
  id: string
  section: {
    name: string
    slug: string
  }
  focusedSectionSlug: string | null
  setFocusedSectionSlug: (slug: string) => void
  onDeleteSection: (slug: string) => void
}

export const SortableItem: React.FC<SortableItemProps> = ({
  id,
  section,
  focusedSectionSlug,
  setFocusedSectionSlug,
  onDeleteSection,
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
    height: 'auto',
    minHeight: '40px', // Fixed minimum height for consistency
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        relative flex items-center py-2 px-3 bg-secondary rounded-md
        ${focusedSectionSlug === id ? 'ring-2 ring-primary' : ''}
        ${isDragging ? 'opacity-75 shadow-lg' : 'opacity-100'}
        mb-2 touch-none
      `}
    >
      <div className="flex items-center justify-between w-[60%] min-w-0">
        <button
          className="flex-1 text-left focus:outline-none min-w-0 pr-2"
          onClick={() => setFocusedSectionSlug(id)}
        >
          <span className="block truncate">{section.name}</span>
        </button>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            className="p-1 hover:bg-background rounded-md focus:outline-none"
            onClick={() => onDeleteSection(id)}
          >
            <X className="w-4 h-4" />
          </button>
          <div {...listeners} className="cursor-move touch-none">
            <GripVertical className="w-4 h-4" />
          </div>
        </div>
      </div>
    </li>
  )
}
