'use client';

import React from 'react';
import MonacoEditor from '@monaco-editor/react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold p-4 text-foreground border-b bg-card">
        Markdown IDE Editor
      </h2>
      <div className="flex-grow">
        <MonacoEditor
          height="100%"
          defaultLanguage="markdown"
          value={value}
          onChange={(value) => onChange(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            renderLineHighlight: 'all',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            padding: { top: 10, bottom: 10 },
            fontSize: 14,
          }}
        />
      </div>
    </div>
  );
}
