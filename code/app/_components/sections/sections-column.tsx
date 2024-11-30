
import React, { useState, useRef, useCallback } from "react"
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

interface Section {
  slug: string
  name: string
  markdown: string
  startLine: number
  endLine: number
}

interface SectionsColumnProps {
  sections: Section[]
  onSectionsChange: (sections: Section[], updatedMarkdown?: string) => void
  repoUrl: string
  currentMarkdown: string
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

export function SectionsColumn({ sections, onSectionsChange, repoUrl, currentMarkdown }: SectionsColumnProps) {
  const [searchFilter, setSearchFilter] = useState('')
  const [focusedSectionSlug, setFocusedSectionSlug] = useState<string | null>(null)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newSectionDescription, setNewSectionDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [draggedItem, setDraggedItem] = useState<Section | null>(null)
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null)
  const dragOverItem = useRef<string | null>(null)

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, section: Section) => {
    setDraggedItem(section)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', section.slug)
    const target = e.target as HTMLElement
    setTimeout(() => {
      target.style.opacity = '0.5'
    }, 0)
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLIElement>, targetSlug: string, index: number) => {
    e.preventDefault()
    dragOverItem.current = targetSlug
    const rect = e.currentTarget.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    if (e.clientY < midpoint) {
      setDropIndicatorIndex(index)
    } else {
      setDropIndicatorIndex(index + 1)
    }
  }, [])

  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    target.style.opacity = '1';

    if (draggedItem && dragOverItem.current && draggedItem.slug !== dragOverItem.current) {
      // Create new sections array with updated order
      const newSections = [...sections];
      const draggedIndex = newSections.findIndex(section => section.slug === draggedItem.slug);
      const targetIndex = newSections.findIndex(section => section.slug === dragOverItem.current);

      // Remove dragged item
      newSections.splice(draggedIndex, 1);

      // Insert at new position
      newSections.splice(dropIndicatorIndex as number, 0, draggedItem);

      // Update the markdown and sections only after drag is complete
      onSectionsChange(newSections);
    }

    setDraggedItem(null);
    dragOverItem.current = null;
    setDropIndicatorIndex(null);
  };

  const onDeleteSection = (sectionSlug: string) => {
    const newSections = sections.filter(s => s.slug !== sectionSlug)
    onSectionsChange(newSections)
    setFocusedSectionSlug(null)
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

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium">Sections</h3>
      </div>

      <div className="">
        <ScrollArea className="">
          <div className="p-4 space-y-4 contents">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3">
                Document Sections
              </h4>
              <SectionFilter
                searchFilter={searchFilter}
                setSearchFilter={setSearchFilter}
              />
              <ul className="space-y-2 relative">
                {dropIndicatorIndex === 0 && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary -translate-y-1/2" />
                )}
                {filteredSections.map((section, index) => (
                  <React.Fragment key={section.slug}>
                    <li
                      draggable
                      onDragStart={(e) => handleDragStart(e, section)}
                      onDragOver={(e) => handleDragOver(e, section.slug, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative flex items-center bg-secondary rounded-md ${focusedSectionSlug === section.slug ? 'ring-2 ring-primary' : ''
                        }`}
                    >
                      <button
                        className="flex-grow px-4 py-1.5 text-left focus:outline-none text-sm"
                        onClick={() => setFocusedSectionSlug(section.slug)}
                      >
                        {section.name}
                      </button>
                      <div className="flex items-center pr-2 space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onDeleteSection(section.slug)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => onDeleteSection(section.slug)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="cursor-move p-2">
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </div>
                    </li>
                    {dropIndicatorIndex === index + 1 && (
                      <div className="h-0.5 bg-primary w-full" />
                    )}
                  </React.Fragment>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3">
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
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Section'}
                </Button>
              </div>
            </div>
            <Separator />
            {availableTemplates.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-3">
                  Template Sections
                </h4>
                <div className="space-y-2">
                  {availableTemplates.map((template) => (
                    <Button
                      key={template.name}
                      variant="secondary"
                      className="w-full justify-start"
                      onClick={() => handleAddTemplateSection(template)}
                      disabled={isGenerating}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      <div className="text-left">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
