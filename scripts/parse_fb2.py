#!/usr/bin/env python3
"""
Parse FB2 file and extract book structure: title, chapters, text.

Usage:
    python scripts/parse_fb2.py <input.fb2> [--output output.json]

If --output is omitted, saves to output/<book-title>.json
"""

import argparse
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

FB_NS = "http://www.gribuser.ru/xml/fictionbook/2.0"
NS = {"fb": FB_NS}


def get_text(element):
    """Get all text inside an element (including children)."""
    if element is None:
        return ""
    # Use itertext and filter out empty strings
    parts = [t for t in element.itertext() if t and t.strip()]
    return "".join(parts).strip()


def clean_text(text):
    """Normalize whitespace: collapse spaces, strip."""
    if not text:
        return ""
    # Replace various whitespace chars with space
    text = re.sub(r"[\r\n\t]+", " ", text)
    # Collapse multiple spaces
    text = re.sub(r" {2,}", " ", text)
    return text.strip()


def parse_fb2(filepath):
    """Parse FB2 file and return dict with title and chapters."""
    if not os.path.exists(filepath):
        print(f"Error: file not found: {filepath}", file=sys.stderr)
        sys.exit(1)

    tree = ET.parse(filepath)
    root = tree.getroot()

    # --- Extract book info ---
    title_info = root.find("fb:description/fb:title-info", NS)

    book_title = "Unknown"
    author_name = ""

    if title_info is not None:
        bt = title_info.find("fb:book-title", NS)
        if bt is not None and bt.text:
            book_title = bt.text.strip()

        author = title_info.find("fb:author", NS)
        if author is not None:
            first = author.find("fb:first-name", NS)
            last = author.find("fb:last-name", NS)
            parts = []
            if first is not None and first.text:
                parts.append(first.text.strip())
            if last is not None and last.text:
                parts.append(last.text.strip())
            author_name = " ".join(parts)

    # --- Extract chapters from the main body ---
    body = root.find("fb:body", NS)
    if body is None:
        print("Error: no <body> found in FB2 file", file=sys.stderr)
        sys.exit(1)

    chapters = []
    sections = body.findall("fb:section", NS)

    if not sections:
        # No sections — treat entire body as one chapter
        paragraphs = body.findall(".//fb:p", NS)
        text_parts = []
        for p in paragraphs:
            t = get_text(p)
            if t:
                text_parts.append(t)
        full_text = clean_text(" ".join(text_parts))
        if full_text:
            chapters.append({
                "title": book_title,
                "text": full_text
            })
    else:
        for section in sections:
            # Chapter title
            title_el = section.find("fb:title", NS)
            chapter_title = get_text(title_el) if title_el is not None else ""
            if not chapter_title:
                chapter_title = f"Chapter {len(chapters) + 1}"

            # Chapter text: extract all <p> tags
            paragraphs = section.findall(".//fb:p", NS)
            text_parts = []
            for p in paragraphs:
                t = get_text(p)
                if t:
                    text_parts.append(t)

            full_text = clean_text(" ".join(text_parts))
            if full_text:
                chapters.append({
                    "title": chapter_title,
                    "text": full_text
                })

    if not chapters:
        print("Error: no chapters found", file=sys.stderr)
        sys.exit(1)

    result = {
        "title": book_title,
        "author": author_name,
        "source_file": os.path.basename(filepath),
        "chapters": chapters
    }

    return result


def safe_filename(name):
    """Convert string to safe filename."""
    # Keep only alphanumeric, spaces, hyphens, underscores
    safe = re.sub(r'[^\w\s\-]', '', name)
    safe = re.sub(r'\s+', '_', safe.strip())
    return safe if safe else "book"


def main():
    parser = argparse.ArgumentParser(description="Parse FB2 file to JSON")
    parser.add_argument("input", help="Path to input .fb2 file")
    parser.add_argument("--output", "-o", help="Output JSON file path")

    args = parser.parse_args()

    result = parse_fb2(args.input)

    # Determine output path
    if args.output:
        output_path = args.output
    else:
        output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output")
        os.makedirs(output_dir, exist_ok=True)
        safe = safe_filename(result["title"])
        output_path = os.path.join(output_dir, f"{safe}.json")

    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    # Print summary
    print(f"Book: {result['title']}")
    if result['author']:
        print(f"Author: {result['author']}")
    print(f"Chapters: {len(result['chapters'])}")
    total_chars = sum(len(ch["text"]) for ch in result["chapters"])
    print(f"Total characters: {total_chars:,}")
    print(f"Saved to: {output_path}")

    for i, ch in enumerate(result["chapters"], 1):
        text_preview = ch["text"][:80].replace("\n", " ")
        print(f"  {i}. {ch['title']} ({len(ch['text']):,} chars) — {text_preview}...")


if __name__ == "__main__":
    main()
