#!/usr/bin/env python3
"""Check the word frequency dictionary: load and display stats."""

import json
import sys
from pathlib import Path


def main():
    freq_path = Path(__file__).resolve().parent.parent / "data" / "word_frequencies.json"

    if not freq_path.exists():
        print(f"Error: file not found: {freq_path}", file=sys.stderr)
        sys.exit(1)

    with open(freq_path, "r", encoding="utf-8") as f:
        freq = json.load(f)

    print(f"File: {freq_path}")
    print(f"Total unique words: {len(freq):,}")
    print()

    # Sort by frequency descending
    sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)

    print("Top 10 most frequent words:")
    print(f"{'#':>4} {'Word':<15} {'Frequency':>12}")
    print("-" * 35)
    for i, (word, count) in enumerate(sorted_words[:10], 1):
        print(f"{i:>4} {word:<15} {count:>12,}")

    print()

    # Frequency distribution
    thresholds = [1, 10, 100, 1000, 10000, 100000, 1000000]
    print("Frequency distribution:")
    print(f"{'Range':<25} {'Count':>8}")
    print("-" * 35)
    prev = 0
    for t in thresholds:
        cnt = sum(1 for _, c in sorted_words if prev <= c < t)
        print(f"{prev:>12,} — {t:<12,} {cnt:>8,}")
        prev = t
    cnt = sum(1 for _, c in sorted_words if c >= prev)
    print(f"{prev:>12,}+{'':14} {cnt:>8,}")

    print()

    # Level-based stats (approximate CEFR mapping)
    levels = {
        "A1": 1000,
        "A2": 3000,
        "B1": 8000,
        "B2": 15000,
        "C1": 30000,
        "C2": 50000,
    }
    print("CEFR level coverage (approximate):")
    print(f"{'Level':<8} {'Top N words':<15} {'Last word freq':>15}")
    print("-" * 42)
    prev_n = 0
    for level, n in levels.items():
        if n > len(sorted_words):
            n = len(sorted_words)
        last_freq = sorted_words[n - 1][1] if n > 0 else 0
        print(f"{level:<8} {prev_n + 1:>6,} – {n:<6,} {last_freq:>15,}")
        prev_n = n


if __name__ == "__main__":
    main()
