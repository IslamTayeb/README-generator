# README generator
 Analyzes personal repositories to create an appealing README.md file

## TODO (120124)
- Add ExcaliDraw integration
    - I want it to be a 40% height window under the code/monaco editor. I want it to be a full exclaidraw application, with a button on top that says "Export". When clicking export, I want an exported image or whatever excalidraw has integrated for its own export to export its diagram and be inserted into the monaco-editor.
- Need to find a way to have 2 LLM agents (utilizing gemini for now). I need one where the user can chat with an agent that directly edits the code in monaco-editor. Then another agent where the user can jsut chat with the LLM without it affect his text in monaco-editor
- Add a button to "refresh" section title. Make it detect the first # or ## header it finds in monaco-editor and let it make that the title for the sections
- Better prompt/s
- Add accounts functionality to save progress
- Ponder over it's better to make the section generator to take into account the entire codebase or just the README
    - Add a way to manage windows, chat feature might be under paywall and with the integration of ExclaiDraw stuff will get messy
- Add frontend to help new people unfamiliar with markdown to introduce diff things (e.g. italics, bolds, indentation, images, link, etc.)
<!-- - PDF reading is really buggy, try with DIIG Data Challenge repository--brings out gibberish. Make sure it only reads in text and nothing else. # No easy way around it because github gets PDFs into binary before it passes through apparently, not as a temp file, so much eaiser to just ignore it. -->
<!-- - Add a way to take into account only the first few lines of each ouput cell in a jupyter notebook if detect. # Just truncated everything for now, thinking about it the code itself might be able to think about what the project is overall about from looking at a few lines of the table... I hope. Just don't want any stupidly long jupyter notebook outputs (which I've seen in the trials of the app) adding cost -->
<!-- - Add button to dialog box called "Add Context". It spawns a dialog box in file-tree that has input to add more context to the project (e.g. DataFest) that gets fed into the LLM prompt -->
<!-- - Change progress bar into a small truncated bar that is basically a console.log of whats happening so they understand whats happening. Even include things like token count so they understand why something like the gemini prompting is taking long if the token count is huge. -->
