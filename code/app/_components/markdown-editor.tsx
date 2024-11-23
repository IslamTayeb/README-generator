'use client'

import React from 'react'
import Editor from '@monaco-editor/react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold p-4 text-foreground border-b bg-card">Markdown IDE Editor</h2>
      <div className="flex-grow">
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={value}
          onChange={(value) => onChange(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            renderLineHighlight: 'none',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>
    </div>
  )
}
