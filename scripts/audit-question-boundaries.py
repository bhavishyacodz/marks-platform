
import json
import re
from pathlib import Path

path = Path("data/extracted/question-drafts-v2.json")
data = json.loads(path.read_text(encoding="utf-8"))

records = [
    r for r in data.get("records", [])
    if r.get("recordType") == "ocr_question_candidate"
]

print("QUESTION BOUNDARY AUDIT")
print("=" * 72)

for r in records:
    text = r.get("questionText", "")
    normalized = " ".join(text.split())
    flags = []

    if len(normalized) < 180:
        flags.append("SHORT")

    if "Options :" not in text and "Options:" not in text:
        flags.append("NO_OPTIONS_MARKER")

    if re.search(
        r"(?i)(Mathematics|Physics|Chemistry)\s+Section\s+[AB]",
        text,
    ):
        flags.append("SECTION_METADATA")

    if len(normalized) > 1800:
        flags.append("LONG")

    print(
        f'Q{r.get("questionNumber"):>2} | '
        f'Page {r["source"]["page"]:>2} | '
        f'{len(normalized):>4} chars | '
        f'{", ".join(flags) if flags else "CHECK"}'
    )

print("\nFlags are clues for manual review, not automatic errors.")
