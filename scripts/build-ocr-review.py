
import json
from pathlib import Path
from html import escape
import os

ROOT = Path.cwd()
EXTRACTED = ROOT / "data/extracted"
MANIFEST = EXTRACTED / "manifests" / (
    "JEE-Main-2026-Question-Paper-B-Tech-"
    "2nd-Apr-Shift-2.json"
)
OCR_DIR = EXTRACTED / "ocr"
OUTPUT = EXTRACTED / "review.html"

if not MANIFEST.exists():
    raise SystemExit(f"Manifest not found: {MANIFEST}")

data = json.loads(MANIFEST.read_text(encoding="utf-8"))
pages = []

for item in data.get("pages", []):
    number = int(item["page"])
    ocr_file = OCR_DIR / f"page-{number:04d}.txt"
    ocr_text = (
        ocr_file.read_text(encoding="utf-8", errors="replace")
        if ocr_file.exists() else ""
    )
    image_rel = item.get("pageImage", "")
    image_path = (EXTRACTED / image_rel).resolve()

    try:
        image_url = os.path.relpath(image_path, EXTRACTED.resolve())
        image_url = image_url.replace(os.sep, "/")
    except ValueError:
        image_url = ""

    pages.append({
        "page": number,
        "image": image_url,
        "text": ocr_text,
        "exists": image_path.exists(),
        "source": ocr_file.name,
    })

payload = json.dumps(pages, ensure_ascii=False).replace(
    "</", "<\\/"
)

template = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MARKS JEE — OCR Review Desk</title>
<style>
:root {
  color-scheme: light;
  --bg:#f5f7fb; --card:#fff; --ink:#172033;
  --muted:#657087; --line:#dfe5ee; --blue:#2459d3;
}
* { box-sizing:border-box }
body {
  margin:0; background:var(--bg); color:var(--ink);
  font:15px/1.5 system-ui,-apple-system,sans-serif;
}
header {
  padding:18px; background:#111b32; color:white;
}
header h1 { margin:0 0 4px; font-size:22px }
header p { margin:0; color:#d1d9e9 }
main { max-width:1200px; margin:auto; padding:14px }
.toolbar,.panel,.statusbar {
  background:var(--card); border:1px solid var(--line);
  border-radius:14px; padding:14px; margin-bottom:12px;
}
.toolbar { display:flex; flex-wrap:wrap; gap:9px; align-items:center }
button,select,input,textarea {
  font:inherit; border:1px solid var(--line); border-radius:9px;
  padding:9px; background:white; color:var(--ink);
}
button { cursor:pointer }
button.primary { background:var(--blue); color:white; border-color:var(--blue) }
button:focus,textarea:focus,select:focus { outline:2px solid #91b3ff }
#layout { display:grid; grid-template-columns:1fr 1fr; gap:12px }
h2 { font-size:17px; margin:0 0 10px }
.page-image {
  width:100%; height:auto; display:block; border:1px solid var(--line);
  border-radius:8px; background:#eee;
}
#ocr { width:100%; min-height:380px; resize:vertical; line-height:1.6 }
#notes { width:100%; min-height:85px; resize:vertical }
.small { color:var(--muted); font-size:13px }
.statusbar { display:flex; flex-wrap:wrap; gap:12px; align-items:center }
.pill { padding:4px 9px; border-radius:20px; background:#eef2f8 }
.warning { color:#9b3d10 }
footer { color:var(--muted); padding:10px 2px; font-size:13px }
@media(max-width:760px) {
  #layout { grid-template-columns:1fr }
  #ocr { min-height:300px }
  main { padding:9px }
}
</style>
</head>
<body>
<header>
  <h1>MARKS JEE — OCR Review Desk</h1>
  <p>Compare original pages with OCR text. Verification requires human review.</p>
</header>
<main>
  <div class="toolbar">
    <label>Page <select id="pageSelect"></select></label>
    <button id="prev">← Previous</button>
    <button id="next">Next →</button>
    <label>Status
      <select id="status">
        <option value="pending">Pending</option>
        <option value="needs_correction">Needs correction</option>
        <option value="verified">Verified</option>
      </select>
    </label>
    <button class="primary" id="save">Save page</button>
    <button id="export">Export CSV</button>
  </div>
  <div class="statusbar">
    <span id="counter" class="pill">Page 1</span>
    <span id="progress">0 verified</span>
    <span id="saveState" class="small">Not saved yet</span>
  </div>
  <div id="layout">
    <section class="panel">
      <h2>Original page image</h2>
      <p id="imageWarning" class="small warning"></p>
      <img id="pageImage" class="page-image" alt="Original PDF page">
      <p class="small">Check question wording, options, symbols, equations and diagrams.</p>
    </section>
    <section class="panel">
      <h2>OCR text — editable draft</h2>
      <textarea id="ocr" spellcheck="false"
        aria-label="Editable OCR text"></textarea>
      <h2 style="margin-top:16px">Reviewer notes</h2>
      <textarea id="notes" placeholder="Describe errors or what you checked"></textarea>
      <p class="small">Only choose Verified after checking the entire page against the image.</p>
    </section>
  </div>
  <footer>
    Drafts and statuses are saved in this browser's local storage.
    Export regularly. Clearing browser data may erase unsaved exports.
  </footer>
</main>
<script>
const pages = __PAGES__;
const KEY = "marks_ocr_review_v1";
let records = {};
let index = 0;
let dirty = false;

try {
  records = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
} catch (e) {
  records = {};
}

function defaultRecord(p) {
  return {
    text: p.text || "",
    notes: "",
    status: "pending"
  };
}
function record(p) {
  if (!records[p.page]) records[p.page] = defaultRecord(p);
  return records[p.page];
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
    dirty = false;
    document.getElementById("saveState").textContent =
      "Saved in this browser";
    updateProgress();
    return true;
  } catch (e) {
    document.getElementById("saveState").textContent =
      "Save failed — export CSV now";
    return false;
  }
}
function updateProgress() {
  const verified = pages.filter(p =>
    record(p).status === "verified"
  ).length;
  const corrected = pages.filter(p =>
    record(p).status === "needs_correction"
  ).length;
  document.getElementById("progress").textContent =
    `${verified} verified · ${corrected} need correction · ${pages.length} total`;
}
function loadPage() {
  const p = pages[index];
  const r = record(p);
  document.getElementById("pageSelect").value = String(index);
  document.getElementById("counter").textContent =
    `Page ${p.page} of ${pages.length}`;
  document.getElementById("ocr").value = r.text;
  document.getElementById("notes").value = r.notes || "";
  document.getElementById("status").value = r.status || "pending";
  const img = document.getElementById("pageImage");
  img.onerror = () => {
    document.getElementById("imageWarning").textContent =
      "Image not found. Check the generated file paths.";
  };
  img.onload = () => {
    document.getElementById("imageWarning").textContent = "";
  };
  img.src = p.image;
  img.alt = `Original page ${p.page}`;
  document.getElementById("prev").disabled = index === 0;
  document.getElementById("next").disabled = index === pages.length - 1;
  document.getElementById("saveState").textContent =
    dirty ? "Unsaved changes" : "Ready";
}
function capture() {
  const p = pages[index];
  const r = record(p);
  r.text = document.getElementById("ocr").value;
  r.notes = document.getElementById("notes").value;
  r.status = document.getElementById("status").value;
  dirty = true;
}
function savePage() {
  capture();
  persist();
  loadPage();
}
function goTo(nextIndex) {
  if (dirty) {
    capture();
    if (!persist()) {
      if (!confirm("Saving failed. Continue without saving?")) return;
    }
  }
  index = Math.max(0, Math.min(pages.length - 1, nextIndex));
  loadPage();
}
function exportCSV() {
  capture();
  persist();
  const cols = ["page", "status", "ocr_text", "reviewer_notes", "source_image"];
  const rows = [cols];
  for (const p of pages) {
    const r = record(p);
    rows.push([
      p.page, r.status, r.text, r.notes, p.image
    ]);
  }
  const csv = rows.map(row => row.map(v =>
    '"' + String(v ?? "").replace(/"/g, '""') + '"'
  ).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "marks-ocr-review-results.csv";
  a.click();
  URL.revokeObjectURL(url);
}
const select = document.getElementById("pageSelect");
pages.forEach((p, i) => {
  const opt = document.createElement("option");
  opt.value = String(i);
  opt.textContent = `Page ${p.page}`;
  select.appendChild(opt);
});
document.getElementById("prev").onclick = () => goTo(index - 1);
document.getElementById("next").onclick = () => goTo(index + 1);
select.onchange = () => goTo(Number(select.value));
document.getElementById("save").onclick = savePage;
document.getElementById("export").onclick = exportCSV;
["ocr", "notes", "status"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    dirty = true;
    document.getElementById("saveState").textContent = "Unsaved changes";
  });
});
window.addEventListener("beforeunload", e => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
loadPage();
updateProgress();
</script>
</body>
</html>
"""

html = template.replace("__PAGES__", payload)
OUTPUT.write_text(html, encoding="utf-8")
print("Created:", OUTPUT)
print("Pages included:", len(pages))
print("Open the HTML file in a browser; keep the assets folder in place.")
