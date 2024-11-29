"use client"

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { SortableItem } from './sortable-item'
import { CustomSection } from './custom-section'
import { SectionFilter } from './section-filter.tsx'
import { useLocalStorage } from 'usehooks-ts'

const kebabCaseToTitleCase = (str: string) => {
  return str
    .split('-')
    .map((word) => {
      return word.slice(0, 1).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

interface SectionsColumnProps {
  selectedSectionSlugs: string[]
  setSelectedSectionSlugs: React.Dispatch<React.SetStateAction<string[]>>
  sectionSlugs: string[]
  setSectionSlugs: React.Dispatch<React.SetStateAction<string[]>>
  setFocusedSectionSlug: React.Dispatch<React.SetStateAction<string | null>>
  focusedSectionSlug: string | null
  templates: any[]
  originalTemplate: any[]
  setTemplates: React.Dispatch<React.SetStateAction<any[]>>
  getTemplate: (slug: string) => any
  darkMode: boolean
}

export const SectionsColumn: React.FC<SectionsColumnProps> = ({
  selectedSectionSlugs,
  setSelectedSectionSlugs,
  sectionSlugs,
  setSectionSlugs,
  setFocusedSectionSlug,
  focusedSectionSlug,
  templates,
  originalTemplate,
  setTemplates,
  getTemplate,
  darkMode,
}) => {
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const [pageRefreshed, setPageRefreshed] = useState(false)
  const [addAction, setAddAction] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [filteredSlugs, setFilteredSlugs] = useState<string[]>([])
  const { saveBackup, deleteBackup } = useLocalStorage()

  useEffect(() => {
    const slugsFromPreviousSession = localStorage.getItem('current-slug-list') || 'title-and-description'
    if (slugsFromPreviousSession.length > 0) {
      setPageRefreshed(true)
      const slugList = slugsFromPreviousSession.includes(',') ? slugsFromPreviousSession.split(',') : [slugsFromPreviousSession]
      setSectionSlugs((prev) => prev.filter((s) => !slugList.includes(s)))
      setSelectedSectionSlugs(slugList)
      setFocusedSectionSlug(slugList[0])
      localStorage.setItem('current-focused-slug', slugList[0])
    }
  }, [])

  const onAddSection = (section: string) => {
    localStorage.setItem('current-focused-slug', section)
    setPageRefreshed(false)
    setAddAction(true)
    setSectionSlugs((prev) => prev.filter((slug) => slug !== section))
    setFilteredSlugs((prev) => prev.filter((slug) => slug !== section))
    setSelectedSectionSlugs((prev) => [...prev, section])
    setFocusedSectionSlug(section)
    setSearchFilter('')
  }

  useEffect(() => {
    localStorage.setItem('current-slug-list', selectedSectionSlugs.join(','))
  }, [selectedSectionSlugs])

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over.id) {
      setSelectedSectionSlugs((sections) => {
        const oldIndex = sections.findIndex((s) => s === active.id)
        const newIndex = sections.findIndex((s) => s === over.id)
        return arrayMove(sections, oldIndex, newIndex)
      })
    }
  }

  const onDeleteSection = (sectionSlug: string) => {
    setSelectedSectionSlugs((prev) => prev.filter((s) => s !== sectionSlug))
    setSectionSlugs((prev) => [...prev, sectionSlug])
    setFocusedSectionSlug(null)
    localStorage.setItem('current-focused-slug', 'noEdit')
  }

  const onResetSection = (sectionSlug: string) => {
    let originalSection

    if (sectionSlug.slice(0, 6) === 'custom') {
      const sectionTitle = kebabCaseToTitleCase(sectionSlug.slice(6))
      originalSection = {
        slug: sectionSlug,
        name: sectionTitle,
        markdown: `## ${sectionTitle}`,
      }
    } else {
      originalSection = originalTemplate.find((s) => s.slug === sectionSlug)
    }

    const newTemplates = templates.map((s) => {
      if (s.slug === originalSection.slug) {
        return originalSection
      }
      return s
    })
    setTemplates(newTemplates)
    saveBackup(newTemplates)
  }

  const resetSelectedSections = () => {
    const sectionResetConfirmed = window.confirm(
      'All sections of your readme will be removed; to continue, click OK'
    )
    if (sectionResetConfirmed) {
      setSectionSlugs((prev) => [...prev, ...selectedSectionSlugs.filter((s) => s !== 'title-and-description')])
      setSelectedSectionSlugs(['title-and-description'])
      setFocusedSectionSlug('title-and-description')
      localStorage.setItem('current-focused-slug', 'noEdit')
      setTemplates(originalTemplate)
      deleteBackup()
    }
  }

  useEffect(() => {
    setFocusedSectionSlug(localStorage.getItem('current-focused-slug') || null)
  }, [focusedSectionSlug])

  const alphabetizedSectionSlugs = sectionSlugs.sort()

  useEffect(() => {
    if (!searchFilter) {
      setFilteredSlugs([])
      return
    }

    const suggestedSlugs = sectionSlugs.filter((slug) => {
      return getTemplate(slug).name.toLowerCase().includes(searchFilter.toLowerCase())
    })

    setFilteredSlugs(suggestedSlugs.length ? suggestedSlugs : [])
  }, [searchFilter, sectionSlugs, getTemplate])

  return (
    <div className="sections w-80 border-r border-border">
      <h3 className="px-4 py-2 text-sm font-medium border-b border-border">
        Sections
        <button
          className="float-right focus:outline-none"
          type="button"
          onClick={resetSelectedSections}
        >
          <span className="sr-only">Reset sections</span>
          <Image
            className="w-auto h-5 inline-block"
            src={darkMode ? '/reset-light.svg' : '/reset.svg'}
            alt="Reset"
            width={16}
            height={16}
          />
        </button>
      </h3>
      <div className="px-4 py-4 overflow-y-auto h-full">
        {selectedSectionSlugs.length > 0 && (
          <h4 className="mb-3 text-xs text-muted-foreground">
            Click to edit
          </h4>
        )}
        <ul className="mb-6 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext items={selectedSectionSlugs}>
              {selectedSectionSlugs.map((s) => {
                const template = getTemplate(s)
                if (template) {
                  return (
                    <SortableItem
                      key={s}
                      id={s}
                      section={template}
                      focusedSectionSlug={focusedSectionSlug}
                      setFocusedSectionSlug={setFocusedSectionSlug}
                      onDeleteSection={onDeleteSection}
                      onResetSection={onResetSection}
                    />
                  )
                }
                return null
              })}
            </SortableContext>
          </DndContext>
        </ul>

        {sectionSlugs.length > 0 && (
          <h4 className="mb-3 text-xs text-muted-foreground">
            Click to add
          </h4>
        )}
        <SectionFilter searchFilter={searchFilter} setSearchFilter={setSearchFilter} />
        <CustomSection
          setSelectedSectionSlugs={setSelectedSectionSlugs}
          setFocusedSectionSlug={setFocusedSectionSlug}
          setPageRefreshed={setPageRefreshed}
          setAddAction={setAddAction}
          setTemplates={setTemplates}
        />
        <ul className="mb-6 space-y-2">
          {(filteredSlugs.length ? filteredSlugs : alphabetizedSectionSlugs).map((s) => {
            const template = getTemplate(s)
            if (template) {
              return (
                <li key={s}>
                  <button
                    className="flex items-center w-full py-2 px-3 text-sm bg-secondary hover:bg-secondary/80 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    type="button"
                    onClick={() => onAddSection(s)}
                  >
                    <span>{template.name}</span>
                  </button>
                </li>
              )
            }
            return null
          })}
          {searchFilter && !filteredSlugs.length && (
            <li className="text-xs text-muted-foreground">
              No matching sections found
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
