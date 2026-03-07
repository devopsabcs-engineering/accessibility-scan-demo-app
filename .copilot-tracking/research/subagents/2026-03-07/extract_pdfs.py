import PyPDF2
import sys
import os

def extract_pdf(filepath, output_path):
    with open(filepath, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        print(f"File: {filepath}")
        print(f"Pages: {len(reader.pages)}")
        
        all_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                all_text.append(f"--- PAGE {i+1} ---\n{text}")
        
        full_text = "\n\n".join(all_text)
        print(f"Total text length: {len(full_text)}")
        
        with open(output_path, 'w', encoding='utf-8') as out:
            out.write(full_text)
        
        print(f"Written to: {output_path}")
        print()

base = r"c:\src\GitHub\devopsabcs-engineering\accessibility-scan-demo-app"
out_dir = os.path.join(base, ".copilot-tracking", "research", "subagents", "2026-03-07")

extract_pdf(
    os.path.join(base, "assets", "sample-accessibility-report.pdf"),
    os.path.join(out_dir, "pdf1-good.txt")
)

extract_pdf(
    os.path.join(base, "assets", "sample-accessibility-report-BAD.pdf"),
    os.path.join(out_dir, "pdf2-bad.txt")
)
