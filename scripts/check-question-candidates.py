
import json
import re
from collections import Counter
from pathlib import Path

path = Path("data/extracted/question-drafts.json")
data = json.loads(path.read_text(encoding="utf-8"))
records = data.get("records", [])

counts = Counter()
flagged = []

for r in records:
    text = r.get("questionText", "").strip()
    lower = text.lower()
    reasons = []

    if not re.search(r"question\s+number\s*:", lower):
        reasons.append("no question-number marker")

    if any(term in lower for term in [
        "for jee main exam preparation",
        "question paper -",
        "total marks:",
        "section marks:",
        "number of questions:",
    ]):
        reasons.append("cover/metadata text")

    if "aglasem.com" in lower and len(text) < 250:
        reasons.append("possible footer-only candidate")

    if len(text) < 100:
        reasons.append("very short text")

    counts["total"] += 1
    if reasons:
        counts["flagged"] += 1
        flagged.append((r.get("id"), reasons, text[:180]))

print("CANDIDATE QUALITY SCREEN")
print("=" * 32)
print("Total candidates:", counts["total"])
print("Flagged for manual inspection:", counts["flagged"])
print("Not flagged:", counts["total"] - counts["flagged"])
print("\nFLAGGED CANDIDATES")
print("=" * 32)

for record_id, reasons, sample in flagged:
    print(f"\n{record_id}")
    print("Reasons:", "; ".join(reasons))
    print("Sample:", re.sub(r"\s+", " ", sample))

print("\nFlags are suggestions, not proof of errors.")
print("No draft records were changed.")
