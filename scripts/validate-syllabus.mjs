import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const syllabusPath = path.join(root, "src/data/syllabus.ts");
const questionsPath = path.join(root, "src/data/questions.ts");
const errors = [];

for (const file of [syllabusPath, questionsPath]) {
  if (!fs.existsSync(file)) {
    console.error(`Syllabus integrity validation failed: ${path.relative(root, file)} was not found.`);
    process.exit(1);
  }
}

function readArray(filePath, variableName) {
  const text = fs.readFileSync(filePath, "utf8");
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const constants = new Map();
  let found;
  function resolve(node) {
    if (!node) return undefined;
    if (ts.isIdentifier(node) && constants.has(node.text)) return constants.get(node.text);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(resolve);
    if (ts.isObjectLiteralExpression(node)) {
      const out = {};
      for (const p of node.properties) {
        if (!ts.isPropertyAssignment(p)) continue;
        const key = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
        if (key !== undefined) out[key] = resolve(p.initializer);
      }
      return out;
    }
    return undefined;
  }
  function walk(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const name = node.name.text;
      if (ts.isIdentifier(node.initializer) && constants.has(node.initializer.text)) {
        constants.set(name, constants.get(node.initializer.text));
      } else if (
        ts.isStringLiteral(node.initializer) ||
        ts.isNoSubstitutionTemplateLiteral(node.initializer) ||
        ts.isNumericLiteral(node.initializer)
      ) {
        constants.set(name, resolve(node.initializer));
      }
      if (name === variableName) found = resolve(node.initializer);
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
  return found;
}

function report(label, message) {
  errors.push(`- ${label}: ${message}`);
}

const catalogue = readArray(syllabusPath, "syllabusCatalogue");
const questions = readArray(questionsPath, "questions");

if (!Array.isArray(catalogue) || catalogue.length === 0) {
  report("syllabusCatalogue", "must be a non-empty static array in src/data/syllabus.ts.");
}
if (!Array.isArray(questions) || questions.length === 0) {
  report("questions", "must be a non-empty static array in src/data/questions.ts.");
}

const chapterIds = new Set();
const subjectChapters = new Set();
const catalogueByChapter = new Map();

for (const [index, chapter] of (Array.isArray(catalogue) ? catalogue : []).entries()) {
  const label = chapter?.id || `syllabus chapter #${index + 1}`;
  for (const field of ["id", "subject", "chapter"]) {
    if (typeof chapter?.[field] !== "string" || !chapter[field].trim()) {
      report(label, `'${field}' must be a non-empty string.`);
    }
  }
  if (chapterIds.has(chapter?.id)) report(label, "duplicate chapter id.");
  if (chapter?.id) chapterIds.add(chapter.id);

  const chapterKey = `${chapter?.subject}::${chapter?.chapter}`;
  if (subjectChapters.has(chapterKey)) report(label, "duplicate subject + chapter name.");
  subjectChapters.add(chapterKey);

  if (!Array.isArray(chapter?.topics) || chapter.topics.length === 0) {
    report(label, "topics must be a non-empty array.");
    continue;
  }
  const seenTopics = new Set();
  for (const topic of chapter.topics) {
    if (typeof topic !== "string" || !topic.trim()) {
      report(label, "each topic must be a non-empty string.");
      continue;
    }
    const normalized = topic.trim().toLocaleLowerCase();
    if (seenTopics.has(normalized)) report(label, `duplicate topic '${topic}'.`);
    seenTopics.add(normalized);
  }
  catalogueByChapter.set(chapterKey, new Set(chapter.topics));
}

for (const [index, question] of (Array.isArray(questions) ? questions : []).entries()) {
  const label = question?.id || `question #${index + 1}`;
  const key = `${question?.subject}::${question?.chapter}`;
  const topics = catalogueByChapter.get(key);
  if (!topics) {
    report(label, `chapter '${question?.chapter}' for subject '${question?.subject}' is missing from the syllabus catalogue.`);
  } else if (typeof question?.topic !== "string" || !topics.has(question.topic)) {
    report(label, `topic '${question?.topic}' is not listed under '${question?.chapter}' for subject '${question?.subject}'.`);
  }
}

if (errors.length) {
  console.error(`Syllabus integrity validation failed with ${errors.length} issue(s):\n${errors.join("\n")}`);
  process.exit(1);
}

console.log(`Syllabus integrity validation passed: ${catalogue.length} catalogue chapters, ${catalogue.reduce((n, chapter) => n + chapter.topics.length, 0)} topics, and ${questions.length} question references checked.`);
