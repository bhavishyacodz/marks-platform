import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("build-import-review-report.py")
SPEC = importlib.util.spec_from_file_location("build_import_review_report", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class BuildImportReviewReportTests(unittest.TestCase):
    def test_report_shows_source_text_and_unverified_key_candidate(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            image_dir = root / "shift-page-images"
            image_dir.mkdir()
            (image_dir / "paper-page-001.png").write_bytes(b"test-image")
            draft = root / "draft.json"
            draft.write_text(json.dumps({
                "status": "needs-human-review",
                "exam": {"label": "2026-04-02-shift-2"},
                "summary": {"questionCandidates": 1, "questionCandidatesFlaggedForReview": 1, "questionIdMatchedCandidates": 1},
                "questions": [{
                    "questionNumber": 1, "questionId": "123456789", "page": 1,
                    "rawText": "Find x < 5", "originalPageImage": "shift-page-images/paper-page-001.png",
                    "answerKeyCandidateOptionId": "987654321",
                    "answerKeyMatchStatus": "question-id-match-needs-human-review",
                    "reviewFlags": ["option_content_may_be_missing_or_ocr_incomplete"],
                }],
            }), encoding="utf-8")
            output = root / "review-report.html"
            MODULE.build_report(draft, output)
            report = output.read_text(encoding="utf-8")
            self.assertIn("Original source page", report)
            self.assertIn("Find x &lt; 5", report)
            self.assertIn("987654321", report)
            self.assertIn("NOT VERIFIED", report)
            self.assertIn("option_content_may_be_missing_or_ocr_incomplete", report)

    def test_missing_image_is_reported_not_silently_omitted(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            draft = root / "draft.json"
            draft.write_text(json.dumps({
                "questions": [{
                    "questionNumber": 4, "page": 2, "rawText": "Question text",
                    "originalPageImage": "missing/page.png",
                    "reviewFlags": [],
                }],
            }), encoding="utf-8")
            output = root / "review-report.html"
            MODULE.build_report(draft, output)
            report = output.read_text(encoding="utf-8")
            self.assertIn("Original page image missing or unsafe", report)

    def test_unsafe_image_path_is_not_linked(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            outside = root.parent / "outside-test-image.png"
            outside.write_bytes(b"not-a-real-image")
            try:
                draft = root / "draft.json"
                draft.write_text(json.dumps({
                    "questions": [{
                        "questionNumber": 5, "page": 3, "rawText": "Question text",
                        "originalPageImage": "../outside-test-image.png",
                        "reviewFlags": [],
                    }],
                }), encoding="utf-8")
                output = root / "review-report.html"
                MODULE.build_report(draft, output)
                report = output.read_text(encoding="utf-8")
                self.assertIn("Original page image missing or unsafe", report)
                self.assertNotIn('href="../outside-test-image.png"', report)
            finally:
                outside.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
