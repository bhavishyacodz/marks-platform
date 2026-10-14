#!/usr/bin/env python3
"""Create a review-only JEE Main draft from question-paper and final-key PDFs.

Requires PyMuPDF and Tesseract OCR. OCR improves text recovery but cannot reliably
interpret equations, diagrams, option order, or answer mapping. Nothing is verified
or published by this script.
"""
from __future__ import annotations
import argparse, base64, hashlib, json, os, re, time, urllib.error, urllib.request
from pathlib import Path
import fitz

QUESTION_MARKER = re.compile(r"Question\s*(?:Number\s*:\s*|No\.?\s*:?\s*)(\d+)", re.I)
QUESTION_ID = re.compile(r"Question\s*Id\s*:\s*(\d+)", re.I)
QUESTION_TYPE = re.compile(r"Question\s*Type\s*:\s*(MCQ|SA)\b", re.I)
EXAM_DATE = re.compile(r"Exam\s*Date\s*:\s*([0-9.\-/]+)", re.I)
EXAM_SHIFT = re.compile(r"Exam\s*Shift\s*:\s*(First|Second|Third|1st|2nd|3rd|\d+)", re.I)
KEY_ROW = re.compile(r"(?<!\d)(\d{7,})(?:\s+|\s*[,|]\s*)(\d{7,})(?!\d)")

def extraction_score(text: str) -> int:
    """Score readable question content, discounting metadata and numeric IDs."""
    markers = list(QUESTION_MARKER.finditer(text))
    score = len(markers) * 2
    # Remove boilerplate before scoring: metadata words like "is" must not make
    # an ID-only native text layer beat OCR that recovered the actual question.
    body = QUESTION_MARKER.sub(" ", text)
    body = QUESTION_ID.sub(" ", body)
    body = QUESTION_TYPE.sub(" ", body)
    body = re.sub(
        r"(?im)^\s*(?:Option Shuffling|Display Question Number|Question Mandatory|Single Line Question Option|Option Orientation)\s*:\s*.*$",
        " ", body
    )
    body = re.sub(r"\b(?:aglasem\.com|Page\s+\d+\s+of\s+\d+)\b", " ", body, flags=re.I)
    body = re.sub(r"\b\d{7,}\b", " ", body)
    meaningful = re.sub(r"[^A-Za-z\u0900-\u097F]+", "", body)
    score += min(len(meaningful), 500) // 4
    score += len(re.findall(r"\b(?:which|what|find|calculate|determine|consider|following|value|equal|shown|given|derive|select|correct|incorrect)\b", body, re.I)) * 3
    score += len(re.findall(r"(?im)^\s*(?:Option\s*)?\(?[A-D]\)?[.)：:]\s+", body)) * 4
    score += len(re.findall(r"Options?\s*:", body, re.I)) * 8
    if markers and len(meaningful) < 12:
        score -= 20 * len(markers)
    return score

def read_pdf(path: Path) -> list[dict]:
    pages_out = []
    with fitz.open(path) as pdf:
        for i, page in enumerate(pdf):
            text = page.get_text("text", sort=True).strip()
            markers = list(QUESTION_MARKER.finditer(text))
            # Trigger OCR not only for blank pages, but also pages where selectable
            # question IDs exist while stems/options are rasterized or missing.
            suspicious = len(text) < 900 or not markers
            if markers:
                chunks = [text[m.start():(markers[j + 1].start() if j + 1 < len(markers) else len(text))] for j, m in enumerate(markers)]
                suspicious = suspicious or any(
                    len(chunk) < 180 or (
                        QUESTION_TYPE.search(chunk) and QUESTION_TYPE.search(chunk).group(1).upper() == "MCQ"
                        and not re.search(r"Options?\s*:", chunk, re.I)
                    )
                    for chunk in chunks
                )
            ocr_text, ocr_error = "", None
            if suspicious:
                try:
                    ocr_text = page.get_textpage_ocr(language="eng", dpi=300, full=True).extractText().strip()
                except Exception as exc:
                    ocr_error = f"{type(exc).__name__}: {exc}"
            # Compare actual readable content, not marker counts: OCR often omits
            # the exact "Question Number" labels but recovers the stem/options that
            # are absent from the selectable PDF text layer.
            def readable_content_length(value: str) -> int:
                body = QUESTION_MARKER.sub(" ", value)
                body = QUESTION_ID.sub(" ", body)
                body = QUESTION_TYPE.sub(" ", body)
                body = re.sub(
                    r"(?im)^\s*(?:Option Shuffling|Display Question Number|Question Mandatory|Single Line Question Option|Option Orientation)\s*:\s*.*$",
                    " ", body
                )
                body = re.sub(r"\b(?:aglasem\.com|Page\s+\d+\s+of\s+\d+)\b", " ", body, flags=re.I)
                body = re.sub(r"\b\d{7,}\b", " ", body)
                return len(re.sub(r"[^A-Za-z\u0900-\u097F]+", "", body))

            native_content = readable_content_length(text)
            ocr_content = readable_content_length(ocr_text)
            native_incomplete = native_content < max(24, 12 * max(1, len(markers)))
            # If selectable text has question IDs but no actual stem, it must not
            # win merely because it contains lots of metadata and option IDs.
            def has_meaningful_question_stems(value: str) -> bool:
                value_markers = list(QUESTION_MARKER.finditer(value))
                if not value_markers:
                    return readable_content_length(value) >= 40
                for j, value_marker in enumerate(value_markers):
                    value_chunk = value[value_marker.start():(value_markers[j + 1].start() if j + 1 < len(value_markers) else len(value))]
                    value_stem = re.split(r"Options?\s*:", value_chunk, maxsplit=1, flags=re.I)[0]
                    value_stem = QUESTION_MARKER.sub(" ", value_stem)
                    value_stem = QUESTION_ID.sub(" ", value_stem)
                    value_stem = QUESTION_TYPE.sub(" ", value_stem)
                    value_stem = re.sub(r"(?im)^\s*(?:Option Shuffling|Display Question Number|Question Mandatory|Single Line Question Option|Option Orientation)\s*:\s*.*$", " ", value_stem)
                    value_stem = re.sub(r"\b\d{7,}\b", " ", value_stem)
                    if len(re.sub(r"[^A-Za-z\u0900-\u097F]+", "", value_stem)) >= 12:
                        return True
                return False
            native_has_stem = has_meaningful_question_stems(text)
            ocr_has_stem = has_meaningful_question_stems(ocr_text)
            # Prefer OCR when native extraction is clearly metadata-only and OCR
            # has recovered substantially more readable content. Otherwise use the
            # content score as a conservative tie-breaker.
            # Compare both candidate extractions at the question-chunk level too.
            # A page can contain lots of selectable metadata while the actual stem/options
            # are only recoverable from the scanned image. Page-wide scores can hide that.
            def question_content_score(value: str) -> int:
                markers = list(QUESTION_MARKER.finditer(value))
                if not markers:
                    return extraction_score(value)
                score = 0
                for index, marker in enumerate(markers):
                    chunk = value[marker.start():(markers[index + 1].start() if index + 1 < len(markers) else len(value))]
                    stem = re.split(r"Options?\s*:", chunk, maxsplit=1, flags=re.I)[0]
                    stem = QUESTION_MARKER.sub(" ", stem)
                    stem = QUESTION_ID.sub(" ", stem)
                    stem = QUESTION_TYPE.sub(" ", stem)
                    stem = re.sub(r"(?im)^\s*(?:Option Shuffling|Display Question Number|Question Mandatory|Single Line Question Option|Option Orientation)\s*:\s*.*$", " ", stem)
                    stem = re.sub(r"\b\d{7,}\b", " ", stem)
                    meaningful_stem = re.sub(r"[^A-Za-z\u0900-\u097F]+", "", stem)
                    score += min(len(meaningful_stem), 300)
                    if len(meaningful_stem) < 12:
                        score -= 80
                    options = re.split(r"Options?\s*:", chunk, maxsplit=1, flags=re.I)
                    if QUESTION_TYPE.search(chunk) and QUESTION_TYPE.search(chunk).group(1).upper() == "MCQ":
                        option_text = options[1] if len(options) > 1 else ""
                        cleaned_options = re.sub(r"\b\d{7,}\b|aglasem\.com|Page\s+\d+\s+of\s+\d+", "", option_text, flags=re.I)
                        option_chars = len(re.sub(r"\s+", "", cleaned_options))
                        score += min(option_chars, 300)
                        if option_chars < 12:
                            score -= 80
                return score

            use_ocr = bool(ocr_text) and (
                (not native_has_stem and ocr_has_stem)
                or (native_incomplete and ocr_content > native_content + 8)
                or extraction_score(ocr_text) > extraction_score(text)
                or question_content_score(ocr_text) > question_content_score(text)
            )
            chosen = ocr_text if use_ocr else text
            pages_out.append({
                # Save image bytes while the PDF and page are still open.
                "_page_png": page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False).tobytes("png"),
                "page": i + 1,
                "text": chosen,
                "nativeText": text,
                "ocrText": ocr_text,
                "ocrUsed": use_ocr,
                **({"ocrError": ocr_error} if ocr_error else {}),
            })
    return pages_out

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def parse_questions(pages: list[dict]) -> list[dict]:
    found = []
    for page in pages:
        text = page["text"]
        markers = list(QUESTION_MARKER.finditer(text))
        for i, marker in enumerate(markers):
            start = marker.start()
            end = markers[i + 1].start() if i + 1 < len(markers) else len(text)
            chunk = text[start:end].strip()
            id_match = QUESTION_ID.search(chunk)
            type_match = QUESTION_TYPE.search(chunk)
            question_type = type_match.group(1).upper() if type_match else None
            flags = []
            if not id_match:
                flags.append("question_id_not_found")
            # Assess the actual stem before the Options section, not metadata such as
            # "Question Mandatory: No" or IDs that can fool a keyword/length check.
            stem = re.split(r"Options?\s*:", chunk, maxsplit=1, flags=re.I)[0]
            stem = QUESTION_MARKER.sub("", stem)
            stem = QUESTION_ID.sub("", stem)
            stem = QUESTION_TYPE.sub("", stem)
            stem = re.sub(r"(?im)^\s*(?:Option Shuffling|Display Question Number|Question Mandatory|Single Line Question Option|Option Orientation)\s*:\s*.*$", "", stem)
            stem = re.sub(r"\b(?:aglasem\.com|Page\s+\d+\s+of\s+\d+)\b", "", stem, flags=re.I)
            stem = re.sub(r"\b\d{7,}\b", "", stem)
            meaningful_stem = re.sub(r"[^A-Za-z\u0900-\u097F]+", "", stem)
            if len(meaningful_stem) < 12:
                flags.append("question_body_may_be_missing_or_ocr_incomplete")
            # Flag options whose extracted content is only IDs/watermarks or blank.
            options_section = re.split(r"Options?\s*:", chunk, maxsplit=1, flags=re.I)
            if question_type == "MCQ":
                option_text = options_section[1] if len(options_section) > 1 else ""
                cleaned_options = re.sub(r"\b\d{7,}\b|aglasem\.com|Page\s+\d+\s+of\s+\d+", "", option_text, flags=re.I)
                cleaned_options = re.sub(r"\s+", "", cleaned_options)
                if len(cleaned_options) < 12:
                    flags.append("option_content_may_be_missing_or_ocr_incomplete")
            # SA (numerical-answer) questions intentionally have no MCQ options.
            if question_type == "MCQ" and len(options_section) == 1:
                flags.append("options_not_detected")
            elif question_type is None:
                flags.append("question_type_not_detected")
            found.append({
                "questionNumber": int(marker.group(1)),
                "questionId": id_match.group(1) if id_match else None,
                "questionType": question_type,
                "page": page["page"],
                "rawText": chunk,
                "ocrUsedForPage": page.get("ocrUsed", False),
                "needsHumanReview": True,
                "reviewFlags": flags,
            })
    seen, result = set(), []
    for item in found:
        key = (item["questionNumber"], item["questionId"], item["page"])
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result

def canonical_date(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    # Accept both ISO labels (YYYY-MM-DD) and dates printed in NTA PDFs (DD.MM.YYYY).
    iso = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", value)
    if iso:
        return f"{iso.group(1)}-{iso.group(2)}-{iso.group(3)}"
    printed = re.fullmatch(r"(\d{2})[.\-/](\d{2})[.\-/](\d{4})", value)
    if printed:
        return f"{printed.group(3)}-{printed.group(2)}-{printed.group(1)}"
    return None

def canonical_shift(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip().lower()
    return {"first": "1", "1st": "1", "second": "2", "2nd": "2", "third": "3", "3rd": "3", "1": "1", "2": "2", "3": "3"}.get(value)

def parse_key(pages: list[dict], expected_date: str | None, expected_shift: str | None) -> dict:
    # Never combine the whole PDF: it contains multiple dates/shifts and locations.
    target_date = canonical_date(expected_date)
    target_shift = canonical_shift(expected_shift)
    records = []
    for page in pages:
        # Prefer selectable PDF text for metadata. OCR can distort dates and shift labels,
        # and read_pdf intentionally retains nativeText for exactly this reason.
        text = page.get("nativeText") or page["text"]
        date = EXAM_DATE.search(text)
        shift = EXAM_SHIFT.search(text)
        page_date = canonical_date(date.group(1)) if date else None
        page_shift = canonical_shift(shift.group(1)) if shift else None
        records.append((page, text, page_date, page_shift))
    matching = [r for r in records if target_date and target_shift and r[2] == target_date and r[3] == target_shift]
    selected = next((r for r in matching if re.search(r"centers? in india|centres? in india|india", r[1], re.I)), matching[0] if matching else None)
    pairs = []
    if selected:
        for line in selected[1].splitlines():
            # Several question/answer ID pairs can share one PDF text line.
            # Capture every pair; keep all candidates review-only.
            for m in KEY_ROW.finditer(line):
                pairs.append({"questionId": m.group(1), "correctOptionId": m.group(2), "rawLine": line.strip(), "needsHumanReview": True})
    return {
        "examDate": selected[2] if selected else None,
        "examShift": selected[3] if selected else None,
        "selectedPage": selected[0]["page"] if selected else None,
        "matchingPagesFound": len(matching),
        "candidatePairs": pairs,
        "warning": "Review-only candidates from one matching metadata page. Confirm subject, row alignment, IDs and numerical answers against the official final key. No answers are verified.",
    }
def normalize_date(value: str | None) -> str | None:
    if not value:
        return None
    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})-shift-\d+", value, re.I)
    if m:
        # Return ISO format to match canonical_date() and compare metadata consistently.
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return None


def gemini_pages_transcription(page_images: list[tuple[int, bytes]], api_key: str, model: str) -> tuple[dict[int, str] | None, str | None]:
    """Transcribe a small batch of source pages in one request; all results remain unverified."""
    try:
        parts = [{
            "text": (
                "Transcribe each attached JEE Main question-paper page independently. "
                "The text immediately before each image identifies its page_number. "
                "Return one object for every supplied page, including pages with no detectable question. "
                "Transcribe stems and options exactly; preserve equations, signs, powers, roots, Greek letters "
                "and option labels. Never solve or infer missing content; use [UNCLEAR] for unreadable text. "
                "question_id must be the official numeric Question Id, not question number, page number, or option ID. "
                "For MCQs return visible options in printed order; do not invent options. Numerical-answer questions "
                "may have an empty options array. has_diagram is true if a diagram/graph/figure is present or needed. "
                "Do not mark anything verified."
            )
        }]
        for page_number, page_png in page_images:
            parts.append({"text": f"BEGIN SOURCE PAGE page_number={page_number}"})
            parts.append({"inline_data": {"mime_type": "image/png", "data": base64.b64encode(page_png).decode("ascii")}})
            parts.append({"text": f"END SOURCE PAGE page_number={page_number}"})
        question_schema = {
            "type": "OBJECT",
            "properties": {
                "question_id": {"type": "STRING"},
                "stem": {"type": "STRING"},
                "options": {"type": "ARRAY", "items": {"type": "STRING"}},
                "has_diagram": {"type": "BOOLEAN"}
            },
            "required": ["question_id", "stem", "options", "has_diagram"]
        }
        schema = {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "page_number": {"type": "INTEGER"},
                    "questions": {"type": "ARRAY", "items": question_schema}
                },
                "required": ["page_number", "questions"]
            }
        }
        body = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 8192,
                "responseMimeType": "application/json",
                "responseSchema": schema
            }
        }
        endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent"
        request = urllib.request.Request(
            endpoint, data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
            method="POST"
        )
        # Retry only transient service/rate errors with bounded backoff. Persistent
        # errors remain visible; this does not rotate keys to bypass quota limits.
        result = None
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=120) as response:
                    result = json.loads(response.read().decode("utf-8"))
                break
            except urllib.error.HTTPError as exc:
                if exc.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise
                time.sleep(2 ** (attempt + 1))
        if result is None:
            return None, "Gemini transient retries exhausted"
        text_parts = [
            part["text"]
            for candidate in result.get("candidates", [])
            for part in candidate.get("content", {}).get("parts", [])
            if isinstance(part.get("text"), str)
        ]
        recovered = "\n".join(text_parts).strip()
        if not recovered:
            return None, "Gemini returned no transcription text"
        try:
            parsed = json.loads(recovered)
        except json.JSONDecodeError as exc:
            return None, f"Gemini returned invalid JSON: {exc}"
        if not isinstance(parsed, list):
            return None, "Gemini JSON response was not an array"
        expected_pages = {number for number, _ in page_images}
        result_by_page = {}
        for item in parsed:
            if not isinstance(item, dict) or not isinstance(item.get("page_number"), int) or not isinstance(item.get("questions"), list):
                return None, "Gemini page response has invalid fields"
            number = item["page_number"]
            if number not in expected_pages or number in result_by_page:
                return None, "Gemini returned an unknown or duplicate page number"
            for index, question in enumerate(item["questions"]):
                required = {"question_id", "stem", "options", "has_diagram"}
                if not isinstance(question, dict) or not required.issubset(question):
                    return None, f"Gemini page {number}, question {index + 1} is missing required fields"
                if not isinstance(question["question_id"], str) or not isinstance(question["stem"], str) or not question["stem"].strip():
                    return None, f"Gemini page {number}, question {index + 1} has invalid ID/stem"
                if not isinstance(question["options"], list) or not all(isinstance(opt, str) for opt in question["options"]):
                    return None, f"Gemini page {number}, question {index + 1} has invalid options"
                if not isinstance(question["has_diagram"], bool):
                    return None, f"Gemini page {number}, question {index + 1} has invalid diagram flag"
            result_by_page[number] = json.dumps(item["questions"], ensure_ascii=False)
        if set(result_by_page) != expected_pages:
            return None, "Gemini omitted one or more source pages"
        return result_by_page, None
    except urllib.error.HTTPError as exc:
        try:
            detail = exc.read().decode("utf-8", "replace")[:500]
        except Exception:
            detail = "no response body"
        return None, f"Gemini HTTP {exc.code}: {detail}"
    except Exception as exc:
        return None, f"Gemini {type(exc).__name__}: {exc}"

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--paper", required=True, type=Path, help="Question paper PDF")
    parser.add_argument("--key", required=True, type=Path, help="Matching official final answer key PDF")
    parser.add_argument("--out", type=Path, default=Path("data/import/review-drafts"))
    parser.add_argument("--label", default=None, help="Readable shift label, e.g. 2026-04-02-shift-2")
    args = parser.parse_args()
    for path in (args.paper, args.key):
        if not path.is_file() or path.suffix.lower() != ".pdf":
            parser.error(f"expected an existing PDF: {path}")
    paper_pages, key_pages = read_pdf(args.paper), read_pdf(args.key)
    label = args.label or args.paper.stem
    expected_date = normalize_date(label)
    shift_match = re.search(r"shift-(\d+)", label, re.I)
    expected_shift = shift_match.group(1) if shift_match else None
    questions, key = parse_questions(paper_pages), parse_key(key_pages, expected_date, expected_shift)
    gemini_attempted = gemini_succeeded = gemini_failed = 0
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
    if api_key:
        # Transcribe only source pages containing flagged questions. Results stay
        # separate from rawText and are never treated as verified or auto-published.
        page_to_questions = {}
        for question in questions:
            if question.get("reviewFlags"):
                page_to_questions.setdefault(question["page"], []).append(question)
        # Keep each request to one page: multi-page responses were frequently
        # truncated or malformed JSON, wasting the whole batch even when some pages
        # were readable. Smaller responses make recovery more reliable; all output
        # remains review-only and must be checked against the original page image.
        flagged_pages = list(page_to_questions.items())
        batch_size = 1
        quota_exhausted = False
        service_unavailable = False
        for offset in range(0, len(flagged_pages), batch_size):
            batch = flagged_pages[offset:offset + batch_size]
            images = []
            missing_images = []
            for page_number, _ in batch:
                page_png = paper_pages[page_number - 1].get("_page_png")
                if page_png:
                    images.append((page_number, page_png))
                else:
                    missing_images.append(page_number)
            gemini_attempted += 1
            recovered_by_page, error = gemini_pages_transcription(images, api_key, model) if images else (None, "source page images unavailable")
            if recovered_by_page is None and missing_images:
                error = (error + "; " if error else "") + f"source page image unavailable: {missing_images}"
            for page_number, page_questions in batch:
                transcription = (recovered_by_page or {}).get(page_number)
                page_error = error if recovered_by_page is None else (None if transcription is not None else "Gemini omitted this page")
                for question in page_questions:
                    question["geminiRecovery"] = {
                        "status": "transcribed-needs-human-review" if transcription else "failed",
                        "model": model,
                        "text": transcription,
                        "error": page_error,
                        "isVerified": False,
                        "requiresSourceReview": True,
                    }
                if transcription:
                    gemini_succeeded += 1
                else:
                    gemini_failed += 1
            # A 429 means this credential/model is rate- or quota-limited. Do not
            # repeat the same failing request for every remaining page. Mark all
            # remaining candidates as deferred so the report explains why no
            # transcription was attempted; never rotate credentials to bypass quota.
            if recovered_by_page is None and error and re.search(r"Gemini HTTP 429\b", error):
                quota_exhausted = True
                remaining_pages = flagged_pages[offset + batch_size:]
                for page_number, page_questions in remaining_pages:
                    for question in page_questions:
                        question["geminiRecovery"] = {
                            "status": "deferred-quota",
                            "model": model,
                            "text": None,
                            "error": "Skipped after Gemini HTTP 429; retry after quota/rate limit resets.",
                            "isVerified": False,
                            "requiresSourceReview": True,
                        }
                gemini_failed += len(remaining_pages)
                break
            # HTTP 503 after the request helper's bounded retries indicates a
            # provider-side outage. Stop sending identical requests for each page.
            if recovered_by_page is None and error and re.search(r"Gemini HTTP 503\b", error):
                service_unavailable = True
                remaining_pages = flagged_pages[offset + batch_size:]
                for page_number, page_questions in remaining_pages:
                    for question in page_questions:
                        question["geminiRecovery"] = {
                            "status": "deferred-service-unavailable",
                            "model": model,
                            "text": None,
                            "error": "Skipped after Gemini HTTP 503; retry when provider service recovers.",
                            "isVerified": False,
                            "requiresSourceReview": True,
                        }
                gemini_failed += len(remaining_pages)
                break
    warnings = [
        "This is a draft extraction, not a publishable question bank.",
        "Do not infer option text, diagrams, chapter/topic or answer from IDs alone.",
        "Check every question and all four options against page images; verify answers against the matching final key.",
        "OCR is a best-effort text aid; equations, diagrams, superscripts, subscripts and option order require visual review.",
    ]
    if api_key and "service_unavailable" in locals() and service_unavailable:
        warnings.insert(0, "GEMINI SERVICE UNAVAILABLE: received HTTP 503 after bounded retries; remaining page requests were skipped. Retry when the provider recovers. All transcriptions remain unverified.")
    mismatch = (not expected_date or not expected_shift or not key["examDate"] or not key["examShift"] or expected_date != key["examDate"] or expected_shift != key["examShift"])
    if mismatch:
        warnings.insert(0, f"BLOCKING SOURCE MISMATCH: label expects {expected_date}, but key extraction reports {key['examDate']}. Do not use these answer-key candidates.")
    if not key["examDate"] or not key["examShift"]:
        warnings.insert(0, "SOURCE METADATA INCOMPLETE: could not confidently extract both date and shift from the key.")

    # Link question IDs to answer-key IDs only as review candidates. A shared ID
    # is not proof that the selected key row/subject/option is correct.
    key_options_by_id: dict[str, set[str]] = {}
    for pair in key["candidatePairs"]:
        key_options_by_id.setdefault(pair["questionId"], set()).add(pair["correctOptionId"])
    matched_ids = ambiguous_ids = unmatched_ids = 0
    if not mismatch:
        for question in questions:
            qid = question.get("questionId")
            options = key_options_by_id.get(qid, set()) if qid else set()
            if len(options) == 1:
                question["answerKeyCandidateOptionId"] = next(iter(options))
                question["answerKeyMatchStatus"] = "question-id-match-needs-human-review"
                matched_ids += 1
            elif len(options) > 1:
                question["answerKeyCandidateOptionId"] = None
                question["answerKeyMatchStatus"] = "ambiguous-key-id"
                question["reviewFlags"].append("answer_key_id_has_conflicting_options")
                ambiguous_ids += 1
            else:
                question["answerKeyCandidateOptionId"] = None
                question["answerKeyMatchStatus"] = "no-key-id-match"
                question["reviewFlags"].append("answer_key_question_id_not_matched")
                unmatched_ids += 1
    else:
        for question in questions:
            question["answerKeyCandidateOptionId"] = None
            question["answerKeyMatchStatus"] = "blocked-source-mismatch"
            question["reviewFlags"].append("answer_key_source_mismatch")
        unmatched_ids = len(questions)

    ocr_errors = sum(bool(p.get("ocrError")) for p in paper_pages + key_pages)
    if ocr_errors:
        warnings.append(f"OCR failed on {ocr_errors} page(s); inspect those pages manually.")
    if api_key and "quota_exhausted" in locals() and quota_exhausted:
        warnings.append("GEMINI QUOTA/RATE LIMIT: received HTTP 429; remaining page requests were skipped to avoid repeated failures. Retry after the limit resets. All transcriptions remain unverified.")
    suspicious = sum(bool(q["reviewFlags"]) for q in questions)
    args.out.mkdir(parents=True, exist_ok=True)
    safe_label = re.sub(r"[^A-Za-z0-9._-]+", "-", label).strip("-")
    # Preserve an original page image for EVERY question candidate, not only
    # candidates whose OCR checks raised flags. OCR can be wrong without detecting it.
    # Questions sharing a page share one image file to avoid duplicating large assets.
    asset_dir = args.out / (safe_label + "-page-images")
    question_pages = sorted({q["page"] for q in questions})
    if question_pages:
        asset_dir.mkdir(parents=True, exist_ok=True)
        with fitz.open(args.paper) as source_pdf:
            for page_number in question_pages:
                page_image = asset_dir / f"paper-page-{page_number:03d}.png"
                source_pdf[page_number - 1].get_pixmap(matrix=fitz.Matrix(2.0, 2.0), alpha=False).save(page_image)
                image_ref = str(page_image.relative_to(args.out))
                for q in questions:
                    if q["page"] == page_number:
                        q["originalPageImage"] = image_ref
                        q["sourcePageRef"] = f"{args.paper.name}#page={page_number}"
    output = args.out / (safe_label + ".json")
    payload = {
        "schemaVersion": 2,
        "status": "blocked-source-mismatch" if mismatch else "needs-human-review",
        "exam": {"label": label, "expectedDateFromLabel": expected_date, "dateFromKey": key["examDate"], "shiftFromKey": key["examShift"]},
        "sources": {
            "paper": {"filename": args.paper.name, "sha256": sha256(args.paper), "pageCount": len(paper_pages), "ocrPages": sum(bool(p.get("ocrUsed")) for p in paper_pages)},
            "finalAnswerKey": {"filename": args.key.name, "sha256": sha256(args.key), "pageCount": len(key_pages), "ocrPages": sum(bool(p.get("ocrUsed")) for p in key_pages)},
        },
        "summary": {
            "questionCandidates": len(questions),
            "questionCandidatesFlaggedForReview": sum(bool(q["reviewFlags"]) for q in questions),
            "keyCandidatePairs": len(key["candidatePairs"]),
            "questionIdMatchedCandidates": matched_ids,
            "ambiguousQuestionIdMatches": ambiguous_ids,
            "unmatchedQuestionIds": unmatched_ids,
            "duplicateKeyQuestionIds": sum(1 for values in key_options_by_id.values() if len(values) > 1),
            "sourceMismatch": mismatch,
            "geminiPagesAttempted": gemini_attempted,
            "geminiPagesSucceeded": gemini_succeeded,
            "geminiPagesFailed": gemini_failed,
        },
        "questions": questions,
        "answerKey": key,
        "warnings": warnings,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Created {len(questions)} question candidates; {sum(bool(q['reviewFlags']) for q in questions)} have review flags; {len(key['candidatePairs'])} answer-key row candidates.")
    print(f"ID-level key candidates: {matched_ids} matched, {ambiguous_ids} ambiguous, {unmatched_ids} unmatched.")
    print("ID-level matches are not verified answers; inspect the original paper and matching final-key row.")
    print(f"OCR pages: paper {payload['sources']['paper']['ocrPages']}/{len(paper_pages)}, key {payload['sources']['finalAnswerKey']['ocrPages']}/{len(key_pages)}.")
    if mismatch:
        print(f"BLOCKED: expected key date {expected_date}; extracted key date {key['examDate']}.")
    print(f"Review draft: {output}")
    print("Nothing was published or marked verified.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
