#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const input = process.argv[2];
const output = process.argv[3] || "data/import/question-drafts.json";

if (!input) {
  console.error("Usage: npm run draft:questions -- <extracted-pages.json> [drafts.json]");
  process.exit(2);
}
const inputPath = path.resolve(input);
const outputPath = path.resolve(output);
if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(2);
}

const source = JSON.parse(fs.readFileSync(inputPath, "utf8"));
if (!Array.isArray(source.pages)) {
  console.error("Input must be a PDF.js extraction JSON containing a pages array.");
  process.exit(2);
}

// These page-level labels often occur in exam PDFs and are not question content.
const pageHeading = /(?:aglasem\.com|for more question papers[^\n]*|national testing agency|question paper name\s*:|creation date\s*:|duration\s*:|total marks\s*:|display marks\s*:)/ig;
const questionStart = /Question\s*Number\s*:\s*(\d+)\s+Question\s*Id\s*:\s*([A-Za-z0-9_-]+)/ig;
const drafts = [];
const seen = new Set();

for (const page of source.pages) {
  const text = typeof page.text === "string" ? page.text : "";
  const starts = [...text.matchAll(questionStart)];
  for (let i = 0; i < starts.length; i += 1) {
    const match = starts[i];
    const start = match.index ?? 0;
    const end = i + 1 < starts.length ? (starts[i + 1].index ?? text.length) : text.length;
    const block = text.slice(start, end).trim();
    const number = Number(match[1]);
    const sourceQuestionId = match[2];
    const uniqueKey = `${page.pageNumber}:${sourceQuestionId}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    const optionIds = [...block.matchAll(/(?:^|\s)(\d{6,})\s*\./g)].map(m => m[1]);
    const cleaned = block.replace(pageHeading, "").replace(/\s+/g, " ").trim();
    const hasPromptLikeText = /(?:Which|What|Find|Calculate|Determine|Select|Consider|If\s|Let\s|The\s|A\s|An\s|value|equal|correct|incorrect|\?)/i.test(cleaned);
    const hasQuestionType = /Question\s*Type\s*:\s*(MCQ|Numerical|Integer|Multiple)/i.test(block);
    drafts.push({
      draftId: `draft-p${page.pageNumber}-q${number}-${sourceQuestionId}`,
      sourceQuestionId,
      displayedQuestionNumber: number,
      sourceFile: source.sourceFile || path.basename(inputPath),
      pageNumber: page.pageNumber,
      questionTypeHint: (block.match(/Question\s*Type\s*:\s*([^\n]+)/i) || [])[1]?.trim().split(/\s{2,}/)[0] || null,
      optionReferenceIds: [...new Set(optionIds)],
      extractedBlock: block,
      extractedTextLooksComplete: hasPromptLikeText && block.length > 100,
      hasQuestionTypeMetadata: hasQuestionType,
      status: "needs-human-review",
      warnings: [
        "Draft segmentation uses printed question metadata; it is not a verified question.",
        ...(!hasPromptLikeText ? ["Question prompt may be missing or stored as an image."] : []),
        ...(optionIds.length < 2 ? ["Fewer than two option reference IDs detected; options may be missing or image-based."] : []),
        "Answer key has not been matched; no answer or solution was inferred.",
        "Check the original PDF page for equations, diagrams, options, and reading order."
      ]
    });
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({
  schemaVersion: 1,
  sourceFile: source.sourceFile || path.basename(inputPath),
  inputExtraction: path.basename(inputPath),
  generatedAt: new Date().toISOString(),
  method: "conservative metadata segmentation; no OCR or answer inference",
  pageCount: source.pageCount ?? source.pages.length,
  draftCount: drafts.length,
  drafts
}, null, 2) + "\n");

console.log(`Created ${drafts.length} question draft(s) from ${source.pages.length} page record(s).`);
console.log(`Saved review-only drafts to ${outputPath}`);
console.log("Drafts are not import-ready or verified. No answers were inferred and nothing was published.");
if (drafts.length === 0) {
  console.log("No 'Question Number: ... Question Id: ...' metadata was detected. OCR or a different PDF layout may be required.");
}
