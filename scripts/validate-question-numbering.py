
import json
from collections import Counter
from pathlib import Path

path = Path("data/extracted/question-drafts-v2.json")
data = json.loads(path.read_text(encoding="utf-8"))

records = [
    r for r in data.get("records", [])
    if r.get("recordType") == "ocr_question_candidate"
]

numbers = [
    r.get("questionNumber")
    for r in records
    if isinstance(r.get("questionNumber"), int)
]

counts = Counter(numbers)
duplicates = sorted(n for n, count in counts.items() if count > 1)

if numbers:
    expected = set(range(min(numbers), max(numbers) + 1))
    missing = sorted(expected - set(numbers))
else:
    missing = []

print("QUESTION NUMBERING VALIDATION")
print("=" * 36)
print("Candidates:", len(records))
print("Numbered candidates:", len(numbers))
print("Unique question numbers:", len(set(numbers)))
print("Duplicate question numbers:", duplicates or "None")
print("Missing numbers within detected range:", missing or "None")

print("\nDetected question-number range:")
if numbers:
    print(f"{min(numbers)} to {max(numbers)}")
else:
    print("No question numbers detected")

print("\nNumbering issues are not proof of missing questions.")
print("Check the original PDF before correcting any records.")
