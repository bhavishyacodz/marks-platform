
import json
from pathlib import Path

path = Path("data/extracted/question-drafts.json")
data = json.loads(path.read_text(encoding="utf-8"))
records = data.get("records", [])

print("FIRST 10 QUESTION DRAFTS")
print("=" * 40)

for record in records[:10]:
    source = record.get("source", {})
    text = record.get("questionText", "")

    print(f"\nID: {record.get('id')}")
    print(f"Source page: {source.get('page')}")
    print("-" * 40)
    print(text[:1200])
    print("\n" + "=" * 40)
