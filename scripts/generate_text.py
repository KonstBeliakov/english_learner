#!/usr/bin/env python3
"""
Generate a text with word replacements, ready for the web app.

Takes a book JSON (from parse_fb2.py) and word selection (from select_words.py),
splits the chapter into paragraphs, and produces an output file
compatible with the web app's texts.js format.

Usage:
    python scripts/generate_text.py --book output/book.json --words selection.json
    python scripts/generate_text.py --book output/book.json --en angel,grace --ru angel,grace
"""

import argparse
import json
import os
import re
import sys


def split_into_paragraphs(text):
    """Split text into paragraphs by sentence boundaries."""
    text = text.strip()

    # Try splitting by multiple newlines first
    parts = re.split("\\n{2,}", text)
    if len(parts) > 1:
        return [p.strip() for p in parts if p.strip()]

    # Split by sentence endings: . ! ? followed by space and capital letter
    sentences = re.split(
        "(?<=[.!?])\\s+(?=[А-ЯA-Z])",
        text
    )

    # Group sentences into paragraphs (3-5 sentences per paragraph)
    PARAGRAPH_SIZE = 4
    paragraphs = []
    for i in range(0, len(sentences), PARAGRAPH_SIZE):
        group = sentences[i:i + PARAGRAPH_SIZE]
        paragraphs.append(" ".join(group))

    return [p for p in paragraphs if p.strip()]

def find_words_in_text(text, words):
    """Find which word pairs appear in the text."""
    text_lower = text.lower()
    found = []
    seen = set()

    for w in words:
        ru_lower = w["ru"].lower()
        if ru_lower in text_lower:
            key = (w["en"], w["ru"])
            if key not in seen:
                seen.add(key)
                found.append({"en": w["en"], "ru": w["ru"]})

    return found


def generate_text(book_data, word_pairs, chapter_num):
    """Generate web-app-compatible text structure."""
    # Get chapter
    if chapter_num < 1 or chapter_num > len(book_data["chapters"]):
        msg = "Error: chapter " + str(chapter_num) + " out of range"
        print(msg, file=sys.stderr)
        sys.exit(1)

    chapter = book_data["chapters"][chapter_num - 1]
    chapter_text = chapter["text"]
    chapter_title = chapter["title"]

    # Split text into paragraphs
    paragraphs_raw = split_into_paragraphs(chapter_text)

    # Build paragraphs with word replacements
    paragraphs = []
    for para_text in paragraphs_raw:
        words_in_para = find_words_in_text(para_text, word_pairs)
        paragraphs.append({
            "ru": para_text,
            "words": words_in_para
        })

    # Create output structure matching texts.js
    book_id = book_data["title"].lower().replace(" ", "_")
    result = {
        "id": book_id + "_ch" + str(chapter_num),
        "title": chapter_title,
        "book": book_data["title"],
        "author": book_data.get("author", ""),
        "paragraphs": paragraphs
    }

    return result


def main():
    parser = argparse.ArgumentParser(description="Generate text with word replacements")
    parser.add_argument("--book", "-b", required=True,
                        help="Path to book JSON (from parse_fb2.py)")
    parser.add_argument("--words", "-w", default=None,
                        help="Path to word selection JSON (from select_words.py)")
    parser.add_argument("--chapter", "-c", type=int, default=1,
                        help="Chapter number (1-based)")
    parser.add_argument("--output", "-o", default=None,
                        help="Output JSON file path")
    parser.add_argument("--en", default=None,
                        help="Comma-separated English words (for testing)")
    parser.add_argument("--ru", default=None,
                        help="Comma-separated Russian translations (for testing)")

    args = parser.parse_args()

    # Load book
    print("Loading book: " + args.book)
    if not os.path.exists(args.book):
        print("Error: book file not found: " + args.book, file=sys.stderr)
        sys.exit(1)
    with open(args.book, "r", encoding="utf-8") as f:
        book_data = json.load(f)

    # Load or create word pairs
    word_pairs = None
    if args.words:
        if not os.path.exists(args.words):
            print("Error: words file not found: " + args.words, file=sys.stderr)
            sys.exit(1)
        with open(args.words, "r", encoding="utf-8") as f:
            words_data = json.load(f)
        if isinstance(words_data, dict) and "words" in words_data:
            word_pairs = words_data["words"]
        elif isinstance(words_data, list):
            word_pairs = words_data
        else:
            word_pairs = [words_data]
        print("Loaded " + str(len(word_pairs)) + " word pairs from file")
    elif args.en and args.ru:
        en_list = [w.strip() for w in args.en.split(",")]
        ru_list = [w.strip() for w in args.ru.split(",")]
        if len(en_list) != len(ru_list):
            print("Error: --en and --ru must have same number of items", file=sys.stderr)
            sys.exit(1)
        word_pairs = [{"en": e, "ru": r} for e, r in zip(en_list, ru_list)]
        print("Using " + str(len(word_pairs)) + " word pairs from command line")
    else:
        print("Error: provide --words or --en/--ru", file=sys.stderr)
        sys.exit(1)

    # Generate
    result = generate_text(book_data, word_pairs, args.chapter)

    # Determine output path
    if args.output:
        output_path = args.output
    else:
        output_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "output"
        )
        os.makedirs(output_dir, exist_ok=True)
        book_base = book_data["title"].lower().replace(" ", "_")
        output_path = os.path.join(
            output_dir,
            book_base + "_ch" + str(args.chapter) + "_generated.json"
        )

    # Save
    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    # Summary
    print()
    print("Generated text:")
    print("  Book: " + book_data["title"])
    print("  Chapter: " + result["title"])
    print("  Paragraphs: " + str(len(result["paragraphs"])))
    total_words = sum(len(p["words"]) for p in result["paragraphs"])
    print("  Total word pairs: " + str(total_words))
    print()
    if result["paragraphs"]:
        p0 = result["paragraphs"][0]
        print("First paragraph preview:")
        print("  Text: " + p0["ru"][:120] + "...")
        en_words = [w["en"] for w in p0["words"]]
        print("  Words: " + str(en_words))
    print()
    print("Saved to: " + output_path)


if __name__ == "__main__":
    main()

