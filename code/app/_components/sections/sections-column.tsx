import React, { useState } from "react"
import { SectionFilter } from "./section-filter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { PlusCircle, BookOpen, GripVertical, X, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import axios from "axios"
import { cn } from "@/lib/utils"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableItem from './sortable-item'

export interface Section {
  slug: string;
  name: string;
  markdown: string;
  startLine: number;
  endLine: number;
}

interface SectionsColumnProps {
  sections: Section[];
  activeSection: Section | null;
  onSectionSelect: (section: Section) => void;
  onSectionsChange: (sections: Section[], updatedMarkdown?: string) => void;
  repoUrl: string;
  currentMarkdown: string;
}

export const templateSections = [
  { name: 'Features', description: 'List of key features and capabilities' },
  { name: 'Installation', description: 'Step-by-step installation guide' },
  { name: 'Configuration', description: 'Configuration options and setup' },
  { name: 'API Documentation', description: 'API endpoints and usage' },
  { name: 'Contributing', description: 'Guidelines for contributors' },
  { name: 'Testing', description: 'Testing procedures and frameworks' },
  { name: 'Security', description: 'Security features and considerations' },
  { name: 'Troubleshooting', description: 'Common issues and solutions' },
]

export function SectionsColumn({
  sections,
  activeSection,
  onSectionSelect,
  onSectionsChange,
  repoUrl,
  currentMarkdown
}: SectionsColumnProps) {
  const [searchFilter, setSearchFilter] = useState('')
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newSectionDescription, setNewSectionDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = sections.findIndex((section) => section.slug === active.id)
      const newIndex = sections.findIndex((section) => section.slug === over.id)

      const newSections = arrayMove(sections, oldIndex, newIndex)
      onSectionsChange(newSections)
    }
  }

  const onDeleteSection = (sectionSlug: string) => {
    const newSections = sections.filter(s => s.slug !== sectionSlug)
    onSectionsChange(newSections)
  }

  const handleGenerateNewSection = async () => {
    if (!newSectionTitle.trim()) return

    setIsGenerating(true)
    try {
      const response = await axios.post('http://localhost:3001/api/sections/generate-section', {
        title: newSectionTitle,
        description: newSectionDescription,
        repoUrl,
        currentMarkdown,
      }, {
        withCredentials: true,
      })

      if (response.data.section) {
        const newContent = response.data.section
        const updatedMarkdown = currentMarkdown +
          (currentMarkdown.endsWith('\n\n') ? '' : '\n\n') +
          newContent

        const newSection = {
          slug: `section-${newSectionTitle.toLowerCase().replace(/[^\w]+/g, '-')}`,
          name: newSectionTitle,
          markdown: newContent,
          startLine: currentMarkdown.split('\n').length + 1,
          endLine: updatedMarkdown.split('\n').length,
        }

        const updatedSections = [...sections, newSection]
        onSectionsChange(updatedSections, updatedMarkdown)
      }
    } catch (error) {
      console.error('Failed to generate new section:', error)
    } finally {
      setIsGenerating(false)
      setNewSectionTitle('')
      setNewSectionDescription('')
    }
  }

  const handleAddTemplateSection = async (template: typeof templateSections[0]) => {
    setIsGenerating(true)
    try {
      const response = await axios.post('http://localhost:3001/api/sections/generate-template-section', {
        template: template.name,
        repoUrl,
        currentMarkdown,
      }, {
        withCredentials: true,
      })

      if (response.data.section) {
        const newContent = response.data.section
        const updatedMarkdown = currentMarkdown +
          (currentMarkdown.endsWith('\n\n') ? '' : '\n\n') +
          newContent

        const newSection = {
          slug: `section-${template.name.toLowerCase().replace(/[^\w]+/g, '-')}`,
          name: template.name,
          markdown: newContent,
          startLine: currentMarkdown.split('\n').length + 1,
          endLine: updatedMarkdown.split('\n').length,
        }

        const updatedSections = [...sections, newSection]
        onSectionsChange(updatedSections, updatedMarkdown)
      }
    } catch (error) {
      console.error('Failed to generate template section:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const filteredSections = sections.filter(section =>
    section.name.toLowerCase().includes(searchFilter.toLowerCase())
  )

  const availableTemplates = templateSections.filter(template =>
    !sections.some(section =>
      section.name.toLowerCase() === template.name.toLowerCase()
    )
  )

  const handleRenameSection = (section: Section, newName: string) => {
    const updatedSection = {
      ...section,
      name: newName,
      slug: `section-${newName.toLowerCase().replace(/[^\w]+/g, '-')}`,
    };

    const newSections = sections.map(s =>
      s.slug === section.slug ? updatedSection : s
    );

    // Check if the new name conflicts with template sections
    const isTemplateSection = templateSections.some(
      template => template.name.toLowerCase() === newName.toLowerCase()
    );

    // If renamed to match a template section, mark that template as used
    if (isTemplateSection) {
      const updatedMarkdown = newSections.map(section => section.markdown).join('\n\n');
      onSectionsChange(newSections, updatedMarkdown);
    } else {
      onSectionsChange(newSections);
    }
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-card w-full">
      <div className="flex-none p-3 border-b">
        <h3 className="text-sm font-medium">Sections</h3>
      </div>

      <div className="p-3 space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          Document Sections
        </h4>
        <SectionFilter
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
        />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredSections.map(section => section.slug)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1.5 relative">
              {filteredSections.map((section) => (
                <SortableItem
                  key={section.slug}
                  section={section}
                  isActive={activeSection?.slug === section.slug}
                  onSelect={() => onSectionSelect(section)}
                  onDelete={() => onDeleteSection(section.slug)}
                  onRename={(newName) => handleRenameSection(section, newName)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <Separator />

        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Create Custom Section
          </h4>
          <div className="space-y-2">
            <Input
              placeholder="Section title"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description (optional)"
              value={newSectionDescription}
              onChange={(e) => setNewSectionDescription(e.target.value)}
              rows={3}
            />
            <Button
              className="w-full"
              onClick={handleGenerateNewSection}
              disabled={isGenerating || !newSectionTitle.trim()}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Section'}
            </Button>
          </div>
        </div>

        {availableTemplates.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Template Sections
              </h4>
              <div className="space-y-1.5">
                {availableTemplates.map((template) => (
                  <Button
                    key={template.name}
                    variant="secondary"
                    className="w-full justify-start h-auto py-2"
                    onClick={() => handleAddTemplateSection(template)}
                    disabled={isGenerating}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BookOpen className="h-4 w-4 flex-none" />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-medium truncate">{template.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {template.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
