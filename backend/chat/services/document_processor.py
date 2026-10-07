import re
import io
import logging
from typing import List
from pypdf import PdfReader

logger = logging.getLogger(__name__)


def extract_text_from_file(file_obj, filename: str) -> str:
    """Extract raw text from an uploaded PDF or TXT/MD file."""
    ext = filename.lower().split(".")[-1]
    logger.info("Extracting document text: filename=%s type=%s", filename, ext)
    
    if ext == "pdf":
        reader = PdfReader(file_obj)
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                pages_text.append(text)
        full_text = "\n\n".join(pages_text)
    else:
        # Default to reading as text (txt, md, etc.)
        content = file_obj.read()
        if isinstance(content, bytes):
            try:
                full_text = content.decode("utf-8")
            except UnicodeDecodeError:
                full_text = content.decode("latin-1", errors="ignore")
        else:
            full_text = str(content)

    return clean_text(full_text)


def clean_text(text: str) -> str:
    """Clean redundant spaces, empty lines, and control characters."""
    if not text:
        return ""
    # Normalize multiple newlines
    text = re.sub(r"\r\n|\r", "\n", text)
    # Remove control characters except newline and tab
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)
    # Normalize excessive spaces
    text = re.sub(r"[ \t]+", " ", text)
    # Collapse more than 2 consecutive newlines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(text: str, chunk_size: int = 600, chunk_overlap: int = 100) -> List[str]:
    """
    Split text into semantically coherent overlapping chunks.
    Splits by paragraphs, then sentences, then words if necessary.
    """
    if not text:
        return []

    # First split into paragraphs
    paragraphs = text.split("\n\n")
    raw_segments: List[str] = []
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(para) <= chunk_size:
            raw_segments.append(para)
        else:
            # Split sentences inside large paragraph
            sentences = re.split(r"(?<=[.!?])\s+", para)
            curr = ""
            for s in sentences:
                if len(curr) + len(s) + 1 <= chunk_size:
                    curr = f"{curr} {s}".strip() if curr else s
                else:
                    if curr:
                        raw_segments.append(curr)
                    if len(s) > chunk_size:
                        # Split by words if sentence exceeds chunk_size
                        words = s.split(" ")
                        w_curr = ""
                        for w in words:
                            if len(w_curr) + len(w) + 1 <= chunk_size:
                                w_curr = f"{w_curr} {w}".strip() if w_curr else w
                            else:
                                if w_curr:
                                    raw_segments.append(w_curr)
                                w_curr = w
                        if w_curr:
                            raw_segments.append(w_curr)
                        curr = ""
                    else:
                        curr = s
            if curr:
                raw_segments.append(curr)

    # Combine segments with overlap
    chunks: List[str] = []
    current_chunk = ""

    for seg in raw_segments:
        if not current_chunk:
            current_chunk = seg
        elif len(current_chunk) + len(seg) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{seg}"
        else:
            chunks.append(current_chunk)
            # Create overlap from end of previous chunk
            if chunk_overlap > 0 and len(current_chunk) > chunk_overlap:
                overlap_text = current_chunk[-chunk_overlap:]
                current_chunk = f"{overlap_text}\n\n{seg}"
            else:
                current_chunk = seg

    if current_chunk and (not chunks or chunks[-1] != current_chunk):
        chunks.append(current_chunk)

    return chunks
