#!/usr/bin/env python3
"""
Select English words from a text for replacement based on difficulty level.

Usage:
    python scripts/select_words.py --input output/book.json --level B1 --percent 8
    python scripts/select_words.py --input output/book.json --chapter 1 --level A2 --percent 10
"""

import argparse
import json
import os
import re
import sys
from collections import Counter


LEVEL_RANGES = {
    "A1": (0, 1000),
    "A2": (1000, 3000),
    "B1": (3000, 8000),
    "B2": (8000, 15000),
    "C1": (15000, 30000),
    "C2": (30000, float("inf")),
}

LEVEL_NAMES = ["A1", "A2", "B1", "B2", "C1", "C2"]


def tokenize_russian(text):
    """Split Russian text into words."""
    return re.findall(r"[\u0430-\u044f\u0451\u0410-\u042f\u0401a-zA-Z]+", text)


def load_json(path):
    """Load a JSON file safely."""
    if not os.path.exists(path):
        print("Error: file not found: " + path, file=sys.stderr)
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_reverse_dict(en_ru_dict):
    """Build Russian -> English reverse dictionary."""
    ru_to_en = {}
    for en, ru in en_ru_dict.items():
        if not ru:
            continue
        primary_ru = ru.split(",")[0].strip().lower()
        if primary_ru not in ru_to_en:
            ru_to_en[primary_ru] = []
        ru_to_en[primary_ru].append(en)
    return ru_to_en


def build_frequency_ranks(freq_dict):
    """Convert frequency dict to rank positions (0 = most frequent)."""
    sorted_words = sorted(freq_dict.items(), key=lambda x: x[1], reverse=True)
    ranks = {}
    for i, (word, _) in enumerate(sorted_words):
        ranks[word] = i
    return ranks


def select_words(text, freq_dict, en_ru_dict, level, percent):
    """Select (en, ru) word pairs for replacement."""
    word_ranks = build_frequency_ranks(freq_dict)
    ru_to_en = build_reverse_dict(en_ru_dict)
    tokens = tokenize_russian(text.lower())
    total_words = len(tokens)

    if total_words == 0:
        return []

    token_counter = Counter(tokens)
    target_count = max(1, int(total_words * percent / 100))

    candidates = []
    seen_pairs = set()

    for ru_word, cnt in token_counter.most_common():
        if ru_word not in ru_to_en:
            continue
        for en_word in ru_to_en[ru_word]:
            if en_word not in word_ranks:
                continue
            rank = word_ranks[en_word]
            pair_key = (en_word, ru_word)
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)
            candidates.append({
                "en": en_word, "ru": ru_word,
                "rank": rank, "count": cnt
            })

    if not candidates:
        return []

    level_min, level_max = LEVEL_RANGES.get(level, (0, float("inf")))
    filtered = [c for c in candidates if level_min <= c["rank"] < level_max]

    if not filtered:
        print("Warning: no candidates for level " + level, file=sys.stderr)
        return []

    # Sort by frequency in text (most common first)
    filtered.sort(key=lambda c: (-c["count"], c["rank"]))

    selected = []
    seen_words = set()
    replaced_tokens = 0

    for candidate in filtered:
        if candidate["en"] in seen_words:
            continue
        seen_words.add(candidate["en"])
        selected.append({
            "en": candidate["en"],
            "ru": candidate["ru"],
        })
        replaced_tokens += candidate["count"]
        if replaced_tokens >= target_count:
            break

    # Sort by first occurrence in text
    def first_occ(pair):
        ru = pair["ru"]
        for i, tok in enumerate(tokens):
            if tok == ru:
                return i
        return len(tokens)

    selected.sort(key=first_occ)
    return selected

def main():
    parser = argparse.ArgumentParser(description="Select English words for replacement")
    parser.add_argument("--input", "-i", required=True)
    parser.add_argument("--freq", "-f", default=None)
    parser.add_argument("--dict", "-d", default=None)
    parser.add_argument("--chapter", "-c", type=int, default=1)
    parser.add_argument("--level", "-l", default="B1", choices=LEVEL_NAMES)
    parser.add_argument("--percent", "-p", type=float, default=8.0)
    parser.add_argument("--save", default=None, help="Save word selection JSON to file")

    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(script_dir, "data")
    freq_path = args.freq or os.path.join(data_dir, "word_frequencies.json")
    dict_path = args.dict or os.path.join(data_dir, "en_ru_dict.json")

    print("Loading chapter: " + args.input)
    book_data = load_json(args.input)

    if args.chapter < 1 or args.chapter > len(book_data["chapters"]):
        msg = "Error: chapter " + str(args.chapter) + " out of range (1-" + str(len(book_data["chapters"])) + ")"
        print(msg, file=sys.stderr)
        sys.exit(1)

    chapter = book_data["chapters"][args.chapter - 1]
    text = chapter["text"]

    print("Chapter: " + chapter["title"])
    print("Text length: " + format(len(text), ",") + " chars")

    tokens = tokenize_russian(text)
    print("Words in text: " + format(len(tokens), ","))

    print("Loading frequency: " + freq_path)
    freq_dict = load_json(freq_path)
    print("  Words: " + format(len(freq_dict), ","))

    print("Loading dictionary: " + dict_path)
    en_ru_dict = load_json(dict_path)
    print("  Entries: " + format(len(en_ru_dict), ","))

    print()
    print("Parameters:")
    print("  Level: " + args.level)
    print("  Replacement: " + str(args.percent) + "%")

    selected = select_words(text, freq_dict, en_ru_dict, args.level, args.percent)

    print()
    print("Results:")
    print("  Selected pairs: " + str(len(selected)))
    if selected:
        selected_rus = {s["ru"] for s in selected}
        replaced = sum(1 for t in tokens if t in selected_rus)
        pct = replaced / len(tokens) * 100 if tokens else 0
        print("  Words to replace: " + format(replaced, ",") + " / " + format(len(tokens), ",") + " (" + format(pct, ".1f") + "%)")
        print()
        print("Selected word pairs:")
        header = format("#", ">3") + " " + format("English", "<20") + " " + format("Russian", "<20")
        print("  " + header)
        print("  " + "-" * 45)
        for i, pair in enumerate(selected, 1):
            line = format(i, ">3") + " " + format(pair["en"], "<20") + " " + format(pair["ru"], "<20")
            print("  " + line)

        output = {
            "book_title": book_data["title"],
            "chapter": args.chapter,
            "chapter_title": chapter["title"],
            "level": args.level,
            "percent": args.percent,
            "words": selected,
        }
        print()
        print("--- JSON output ---")
        print(json.dumps(output, ensure_ascii=False, indent=2))
        if args.save:
            with open(args.save, "w", encoding="utf-8") as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
            print("Saved words to: " + args.save)
    else:
        print("  No words selected. Try a different level or lower the percent.")


if __name__ == "__main__":
    main()

