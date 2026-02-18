"""Text extraction from PDF, DOCX, and image files.

Supports:
- PDF text extraction via pdfplumber (page-by-page)
- Table detection in PDFs
- DOCX paragraph extraction via python-docx
- Image OCR via pytesseract (used as fallback for scanned PDFs and direct image uploads)
"""

from __future__ import annotations

import os
from typing import Optional

from ..schemas import PageText


def extract_text(file_path: str) -> list[PageText]:
    """Extract text from a file, dispatching by extension.

    Returns a list of PageText objects, one per page/section.
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return _extract_pdf(file_path)
    elif ext == ".docx":
        return _extract_docx(file_path)
    elif ext in (".png", ".jpg", ".jpeg"):
        return _extract_image(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _extract_pdf(file_path: str) -> list[PageText]:
    """Extract text from PDF using pdfplumber, with table detection."""
    import pdfplumber

    pages: list[PageText] = []

    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            # Extract main text
            text = page.extract_text() or ""

            # Attempt table extraction
            tables = page.extract_tables()
            table_text_parts: list[str] = []
            if tables:
                for table in tables:
                    for row in table:
                        if row:
                            # Clean cells: strip whitespace, drop None/empty
                            cells = [str(c).strip() for c in row if c and str(c).strip()]
                            if cells:
                                table_text_parts.append(" | ".join(cells))

            if text.strip():
                pages.append(PageText(page=i + 1, text=text, source_kind="pdf_text"))

            if table_text_parts:
                pages.append(
                    PageText(
                        page=i + 1,
                        text="\n".join(table_text_parts),
                        source_kind="table",
                    )
                )

    # Check if text is sparse — may need OCR fallback
    text_pages = [p for p in pages if p.source_kind == "pdf_text"]
    total_chars = sum(len(p.text) for p in text_pages)
    page_count = max(1, len(text_pages))
    avg_chars_per_page = total_chars / page_count

    if avg_chars_per_page < 50:
        # Try OCR fallback for sparse or empty text PDFs
        ocr_pages = _ocr_pdf_fallback(file_path)
        if ocr_pages:
            # Replace sparse text pages with OCR results, keep table extractions
            pages = [p for p in pages if p.source_kind == "table"] + ocr_pages

    return pages


def _extract_docx(file_path: str) -> list[PageText]:
    """Extract text from DOCX using python-docx."""
    from docx import Document

    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    full_text = "\n".join(paragraphs)

    if not full_text.strip():
        return []

    return [PageText(page=1, text=full_text, source_kind="docx")]


def _extract_image(file_path: str) -> list[PageText]:
    """Extract text from an image using pytesseract."""
    try:
        import pytesseract
        from PIL import Image

        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)
        if text.strip():
            return [PageText(page=1, text=text, source_kind="ocr")]
    except ImportError:
        pass  # pytesseract not available
    except Exception:
        pass  # OCR failed

    return []


def _ocr_pdf_fallback(file_path: str) -> list[PageText]:
    """OCR fallback for scanned PDFs using pdftoppm + pytesseract."""
    import subprocess
    import tempfile
    import glob as glob_mod

    pages: list[PageText] = []

    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return []  # OCR dependencies not available

    with tempfile.TemporaryDirectory() as tmpdir:
        output_prefix = os.path.join(tmpdir, "page")

        try:
            subprocess.run(
                ["pdftoppm", "-png", file_path, output_prefix],
                check=True,
                capture_output=True,
                timeout=120,
            )
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return []  # pdftoppm not available or failed

        # Process generated images
        image_files = sorted(glob_mod.glob(os.path.join(tmpdir, "page-*.png")))
        for i, img_path in enumerate(image_files):
            try:
                image = Image.open(img_path)
                text = pytesseract.image_to_string(image)
                if text.strip():
                    pages.append(PageText(page=i + 1, text=text, source_kind="ocr"))
            except Exception:
                continue

    return pages
