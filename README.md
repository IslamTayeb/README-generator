# README generator
 Analyzes personal repositories to create an appealing README.md file

## TODO (120124)
- Make a better scroll bar for the section column part
- Need to find a way to have 2 LLM agents (utilizing gemini for now). I need one where the user can chat with an agent that directly edits the code in monaco-editor. Then another agent where the user can jsut chat with the LLM without it affect his text in monaco-editor
- When links and directories are inside markdown viewer, it can be a little wonky becuase then it takes up more width than it's suppsoed to. I want a way to tell it that it's ok to break the line at _ or / or ? etc.
- Add dialog box in file-tree that has input to add more context to the project (e.g. DataFest) that gets fed into the LLM prompt
- Better prompt/s
- Add accounts functionality to save progress
- Add a button to "refresh" section title. Make it detect the first # or ## header it finds in monaco-editor and let it make that the title for the sections
- Ponder over it's better to make the section generator to take into account the entire codebase or just the README
- Add a way to manage windows, chat feature might be under paywall and with the integration of ExclaiDraw stuff will get messy
- Add frontend to help new people unfamiliar with markdown to introduce diff things (e.g. italics, bolds, indentation, images, link, etc.)
- Add ExcaliDraw integration
- PDF reading is really buggy, try with DIIG Data Challenge repository--brings out gibberish. Make sure it only reads in text and nothing else.
- Add a way to take into account only the first few lines of each ouput cell in a jupyter notebook if detect
- Add a way to remove unknown symbols (mainly �)
- Could add the tree file into the prompt? If not, include the directory of the files. Remove size, SHA, and type since they're all blobs anyway
