# README generator
 Analyzes personal repositories to create an appealing README.md file

## TODO 113024
<!-- - There is a problem with the initialization of markdown viewer once the markdown editor is initialized--it comes up empty. probably a problem with markdownviewer only updating when it detects a change, but doesn't update the moment markdown editor is initialized with data. -->
- There is a problem with code blocks. anything around 2 ``` and comes in the end of the section doesn't get picked up when the sections get moves. This is probably a problem with how the sections are "embedded" with the text inside the markdown. This causes issues when you try to rearrange a section that ends with a code block.
- There is a bug where if you re-arrange the sections, then undo (ctrl+z) in monaco editor to undo the re-arrangement, the section column doesn't detect that change. I don't want to go back to automatically detecting change every single time someone undos or redos, but I'd like a solution.
- Make a better scroll bar for the section column part.
<!-- - The toast that tells you that you're over 20 files is a bit stupid. If I'm 30 files over and de-select my files one by one, the toast would spawn 30 times until I'm 0 files over. Just remove the toast from the file-tree selection thing. -->
- Need to find a way to have 2 LLM agents (utilizing gemini for now). I need one where the user can chat with an agent that directly edits the code in monaco-editor. Then another agent where the user can jsut chat with the LLM without it affect his text in monaco-editor.
- There is a problem where stuff like:
```
npm.tsx
# or
npm.tsx
```
the # or counts as a section. We might need better logic to define what is a section header/subheader and what isn't
