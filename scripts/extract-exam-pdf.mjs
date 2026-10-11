#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const input = process.argv[2];
const output = process.argv[3] || "data/import/extracted-pages.json";

if (!input) {
  console.error("Usage: npm run extract:pdf -- <paper.pdf> [output.json]");
  process.exit(2);
}
const inputPath = path.resolve(input);
const outputPath = path.resolve(output);
if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
  console.error(`PDF not found: ${inputPath}`);
  process.exit(2);
}
if (path.extname(inputPath).toLowerCase() !== ".pdf") {
  console.error("Input must be a .pdf file.");
  process.exit(2);
}

try {
  const pdfjsPath = pathToFileURL(path.resolve("node_modules/pdfjs-dist/legacy/build/pdf.mjs")).href;
  const pdfjs = await import(pdfjsPath);
  const bytes = new Uint8Array(fs.readFileSync(inputPath));
  const document = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = [];
    let current = "";
    let previousY = null;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const text = item.str || "";
      const y = item.transform?.[5] ?? null;
      if (previousY !== null && y !== null && Math.abs(y - previousY) > 3) {
        if (current.trim()) lines.push(current.trim());
        current = "";
      }
      if (current && text && !current.endsWith(" ") && !text.startsWith(" ")) current += " ";
      current += text;
      previousY = y;
      if (item.hasEOL) {
        if (current.trim()) lines.push(current.trim());
        current = "";
        previousY = null;
      }
    }
    if (current.trim()) lines.push(current.trim());
    const text = lines.join("\n").trim();
    pages.push({
      pageNumber,
      text,
      hasExtractableText: text.length > 0,
      reviewStatus: text.length > 0 ? "needs-human-review" : "no-extractable-text",
      warning: text.length > 0
        ? "Text extraction may alter equations, columns, options, and diagram references. Check against the original PDF."
        : "No selectable text found; this page may be scanned or image-based. OCR is not performed by this command."
    });
    console.log(`Extracted page ${pageNumber}/${document.numPages}`);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    schemaVersion: 1,
    sourceFile: path.basename(inputPath),
    extractedAt: new Date().toISOString(),
    extractionMethod: "pdfjs-dist text layer; no OCR",
    pageCount: document.numPages,
    pages
  }, null, 2) + "\n");
  console.log(`Saved ${pages.length} page records to ${outputPath}`);
  console.log("This is a review staging file, not a verified question import. No answers are inferred and nothing is published.");
  await document.destroy();
} catch (error) {
  console.error("PDF extraction failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
