#!/usr/bin/env python3
"""
Build the English-Russian dictionary from the frequency word list.
Filters: only includes words present in the frequency list.

Output: data/en_ru_dict.json  { "word": "перевод" }
"""

import json
import os
import sys


def main():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    freq_path = os.path.join(data_dir, "word_frequencies.json")
    dict_path = os.path.join(data_dir, "en_ru_dict.json")

    if not os.path.exists(freq_path):
        print(f"Error: {freq_path} not found. Run пункт 1 first.", file=sys.stderr)
        sys.exit(1)

    with open(freq_path, "r", encoding="utf-8") as f:
        freq = json.load(f)

    with open(dict_path, "r", encoding="utf-8") as f:
        raw_dict = json.load(f)

    # Build filtered dictionary: only words that exist in frequency list
    dictionary = {}
    for word, translation in raw_dict.items():
        word_lower = word.lower()
        if word_lower in freq and translation:
            dictionary[word_lower] = translation

    with open(dict_path, "w", encoding="utf-8") as f:
        json.dump(dictionary, f, ensure_ascii=False, indent=2)

    print(f"Dictionary saved: {dict_path}")
    print(f"Entries: {len(dictionary)}")
    print(f"Example: {dict(list(dictionary.items())[:5])}")


if __name__ == "__main__":
    main()
