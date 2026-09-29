"""
File processing utilities for extracting text from uploaded documents.

Supported formats:
- PDF  (via PyPDF2)
- DOCX (via python-docx)
- TXT  (plain-text read)
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file.

    Returns an empty string and logs the error on failure.
    """
    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(file_path)
        pages: list[str] = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n".join(pages)
    except Exception:
        logger.exception("Failed to extract text from PDF: %s", file_path)
        return ""


def extract_text_from_docx(file_path: str) -> str:
    """Extract all paragraph text from a DOCX file.

    Returns an empty string and logs the error on failure.
    """
    try:
        from docx import Document

        document = Document(file_path)
        paragraphs: list[str] = [
            para.text for para in document.paragraphs if para.text.strip()
        ]
        return "\n".join(paragraphs)
    except Exception:
        logger.exception("Failed to extract text from DOCX: %s", file_path)
        return ""


def extract_text_from_txt(file_path: str) -> str:
    """Read text from a plain-text file (UTF-8).

    Returns an empty string and logs the error on failure.
    """
    try:
        return Path(file_path).read_text(encoding="utf-8")
    except Exception:
        logger.exception("Failed to read text file: %s", file_path)
        return ""


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

_EXTRACTORS: dict[str, callable] = {
    "pdf": extract_text_from_pdf,
    "docx": extract_text_from_docx,
    "txt": extract_text_from_txt,
}


def extract_text(file_path: str, file_type: str) -> str:
    """Dispatch to the appropriate extractor based on *file_type*.

    Parameters
    ----------
    file_path:
        Absolute or relative path to the file on disk.
    file_type:
        One of ``"pdf"``, ``"docx"``, or ``"txt"`` (case-insensitive).

    Returns
    -------
    str
        The extracted text, or an empty string if the type is
        unsupported or extraction fails.
    """
    normalised = file_type.strip().lower()
    extractor = _EXTRACTORS.get(normalised)
    if extractor is None:
        logger.warning(
            "Unsupported file type '%s' for file: %s", file_type, file_path
        )
        return ""
    return extractor(file_path)
