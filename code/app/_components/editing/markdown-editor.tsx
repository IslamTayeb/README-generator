'use client';

import React from 'react';
import MonacoEditor from '@monaco-editor/react';
import { editor } from 'monaco-editor';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  editorRef?: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
}

export function MarkdownEditor({ value, onChange, editorRef }: MarkdownEditorProps) {
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    if (editorRef) {
      editorRef.current = editor;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-bold p-4 text-foreground border-b bg-card">
        Markdown IDE Editor
      </h2>
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          defaultLanguage="markdown"
          value={value}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorDidMount}
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
            wrappingStrategy: 'advanced',
            padding: { top: 10, bottom: 10 },
            fontSize: 14,
            automaticLayout: true,
            fixedOverflowWidgets: true,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'auto',
              useShadows: false,
              verticalScrollbarSize: 12,
              arrowSize: 11
            }
          }}
        />
      </div>
    </div>
  );
}
