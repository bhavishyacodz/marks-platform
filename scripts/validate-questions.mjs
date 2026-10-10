import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const filePath = path.join(process.cwd(), "src/data/questions.ts");
if (!fs.existsSync(filePath)) {
  console.error("Question validation failed: src/data/questions.ts was not found.");
  process.exit(1);
}

const sourceText = fs.readFileSync(filePath, "utf8");
const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const errors = [];
const questions = [];
const constants = new Map();

function property(object, name) {
  if (!ts.isObjectLiteralExpression(object)) return undefined;
  const item = object.properties.find(p =>
    ts.isPropertyAssignment(p) &&
    ((ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === name)
  );
  return item && ts.isPropertyAssignment(item) ? item.initializer : undefined;
}

function literal(node) {
  if (!node) return undefined;
  if (ts.isIdentifier(node) && constants.has(node.text)) return constants.get(node.text);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

function arrayItems(node) {
  return node && ts.isArrayLiteralExpression(node) ? [...node.elements] : null;
}

function report(id, message) {
  errors.push(`- ${id || "<unknown question>"}: ${message}`);
}

function walk(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer) || ts.isNumericLiteral(node.initializer))) {
    constants.set(node.name.text, literal(node.initializer));
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "questions") {
    const items = arrayItems(node.initializer);
    if (!items) {
      report("questions", "must be initialized with a static array literal.");
    } else {
      questions.push(...items);
    }
  }
  ts.forEachChild(node, walk);
}
walk(sourceFile);

if (questions.length === 0) report("questions", "no question objects were found.");
const ids = new Set();

for (const [index, item] of questions.entries()) {
  const id = literal(property(item, "id"));
  const label = typeof id === "string" && id ? id : `question #${index + 1}`;
  if (typeof id !== "string" || !id.trim()) report(label, "id must be a non-empty string.");
  else if (ids.has(id)) report(label, "duplicate question id.");
  else ids.add(id);

  for (const field of ["subject", "chapter", "topic", "shift", "status", "source", "prompt", "answer", "solution", "difficulty"]) {
    const value = literal(property(item, field));
    if (typeof value !== "string" || !value.trim()) report(label, `'${field}' must be a non-empty string.`);
  }

  const yearNode = property(item, "year");
  const year = literal(yearNode);
  if (year !== null && !(typeof year === "number" && Number.isInteger(year) && year >= 2000 && year <= 2100)) {
    report(label, "'year' must be null or a plausible four-digit year.");
  }

  const status = literal(property(item, "status"));
  if (status !== "verified" && status !== "unverified") report(label, "'status' must be verified or unverified.");
  if (status === "verified") {
    if (year === null || literal(property(item, "shift")) === "Demo practice") {
      report(label, "verified questions need a year and a real exam shift.");
    }
    const sourceUrl = literal(property(item, "sourceUrl"));
    const checkedAt = literal(property(item, "sourceCheckedAt"));
    const notes = literal(property(item, "sourceNotes"));
    if (typeof sourceUrl !== "string" || !sourceUrl.trim()) {
      report(label, "verified questions must include sourceUrl pointing to the official source.");
    } else {
      try {
        const url = new URL(sourceUrl);
        const officialHosts = new Set(["jeemain.nta.nic.in", "nta.ac.in", "www.nta.ac.in"]);
        if (url.protocol !== "https:" || !officialHosts.has(url.hostname.toLowerCase())) {
          report(label, "sourceUrl must be an HTTPS URL on jeemain.nta.nic.in or nta.ac.in.");
        }
      } catch {
        report(label, "sourceUrl must be a valid URL.");
      }
    }
    if (typeof checkedAt !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(checkedAt) || Number.isNaN(Date.parse(checkedAt))) {
      report(label, "verified questions must include sourceCheckedAt in YYYY-MM-DD format.");
    }
    if (typeof notes !== "string" || !notes.trim()) {
      report(label, "verified questions must include sourceNotes describing what was checked.");
    }
  }

  const type = literal(property(item, "type")) ?? "mcq";
  const options = arrayItems(property(item, "options"));
  if (!options) {
    report(label, "'options' must be an array.");
    continue;
  }

  const answer = literal(property(item, "answer"));
  if (type === "numerical") {
    if (options.length !== 0) report(label, "numerical questions must have an empty options array.");
    if (typeof answer !== "string" || answer.trim() === "" || !Number.isFinite(Number(answer))) {
      report(label, "numerical answer must be a finite numeric string.");
    }
    const toleranceNode = property(item, "tolerance");
    const tolerance = toleranceNode ? literal(toleranceNode) : 0.001;
    if (typeof tolerance !== "number" || !Number.isFinite(tolerance) || tolerance < 0) {
      report(label, "'tolerance' must be a finite non-negative number.");
    }
  } else if (type === "mcq") {
    if (options.length < 2) report(label, "MCQs need at least two options.");
    const optionIds = new Set();
    for (const option of options) {
      const optionId = literal(property(option, "id"));
      const optionText = literal(property(option, "text"));
      if (typeof optionId !== "string" || !optionId.trim()) report(label, "each option needs a non-empty id.");
      else if (optionIds.has(optionId)) report(label, `duplicate option id '${optionId}'.`);
      else optionIds.add(optionId);
      if (typeof optionText !== "string" || !optionText.trim()) report(label, "each option needs non-empty text.");
    }
    if (!optionIds.has(answer)) report(label, "answer must match one of the MCQ option ids.");
  } else {
    report(label, `unsupported question type '${type}'. Use 'mcq' or 'numerical'.`);
  }
}

if (errors.length) {
  console.error(`Question bank validation failed with ${errors.length} issue(s):\n${errors.join("\n")}`);
  process.exit(1);
}

console.log(`Question bank validation passed: ${questions.length} questions checked, unique IDs, valid answers and metadata.`);
