import sys
import json
import fitz  # PyMuPDF

def extract_pdf_text(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        text = []
        for page in doc:
            blocks = page.get_text("blocks")
            for block in blocks:
                block_text = block[4].strip()
                if block_text:
                    text.append(block_text)
        doc.close()
        return "\n\n".join(text)
    except Exception as e:
        return f"Error extracting PDF text: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Missing PDF path argument"}))
    else:
        text = extract_pdf_text(sys.argv[1])
        print(json.dumps({"text": text}))
