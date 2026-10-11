#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const input = process.argv[2];
const output = process.argv[3] || "data/import/ocr-pages.json";
const dpi = Number.parseInt(process.argv[4] || "200", 10);

if (!input) {
  console.error("Usage: npm run ocr:pdf -- <paper.pdf> [output.json] [dpi]");
  process.exit(2);
}
if (!Number.isInteger(dpi) || dpi < 120 || dpi > 400) {
  console.error("DPI must be an integer from 120 to 400 (default 200).");
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

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marks-ocr-"));
const prefix = path.join(tempDir, "page");
try {
  execFileSync("pdftoppm", ["-png", "-gray", "-r", String(dpi), inputPath, prefix], { stdio: "inherit" });
  const imagePaths = fs.readdirSync(tempDir)
    .filter((name) => /^page-\d+\.png$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]))
    .map((name) => path.join(tempDir, name));

  if (imagePaths.length === 0) throw new Error("Poppler produced no page images.");
  const pages = [];
  for (let index = 0; index < imagePaths.length; index += 1) {
    const imagePath = imagePaths[index];
    const pageNumber = index + 1;
    const text = execFileSync("tesseract", [imagePath, "stdout", "-l", "eng", "--psm", "6"], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    }).trim();
    pages.push({
      pageNumber,
      text,
      hasExtractableText: text.length > 0,
      reviewStatus: "needs-human-review",
      extractionMethod: "Tesseract OCR over Poppler-rendered page image",
      warning: text.length > 0
        ? "OCR can misread equations, subscripts, symbols, columns, and options. Compare every field with the original PDF page image."
        : "OCR found no text. Inspect the original PDF page image manually."
    });
    console.log(`OCR page ${pageNumber}/${imagePaths.length} (${text.length} characters)`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    schemaVersion: 1,
    sourceFile: path.basename(inputPath),
    extractedAt: new Date().toISOString(),
    extractionMethod: "Poppler page rendering + Tesseract OCR; English model",
    dpi,
    pageCount: pages.length,
    pages
  }, null, 2) + "\n");
  console.log(`Saved ${pages.length} OCR page records to ${outputPath}`);
  console.log("Review staging only. OCR text is not verified, answers are not inferred, and nothing is published.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("PDF OCR failed:", message);
  if (message.includes("Error opening data file") || message.includes("Failed loading language")) {
    console.error("Tesseract's English language data may be missing. Check: tesseract --list-langs");
  }
  process.exitCode = 1;
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
