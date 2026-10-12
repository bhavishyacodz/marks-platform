import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// This is an evidence audit, not a solver. It cannot prove that content is correct.
// By default it reports gaps without changing or blocking the existing live site.
// Use --strict in a release check to fail if a "verified" record lacks audit evidence.

function readStaticArray(filePath, variableName) {
  const source = ts.createSourceFile(filePath, fs.readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const constants = new Map();
  let result;
  function resolve(node) {
    if (!node) return undefined;
    if (ts.isIdentifier(node) && constants.has(node.text)) return constants.get(node.text);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
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
      if (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer) || ts.isNumericLiteral(node.initializer)) constants.set(name, resolve(node.initializer));
      else if (ts.isIdentifier(node.initializer) && constants.has(node.initializer.text)) constants.set(name, constants.get(node.initializer.text));
      if (name === variableName) result = resolve(node.initializer);
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
  return result;
}

const bankPath = path.resolve("src/data/questions.ts");
if (!fs.existsSync(bankPath)) {
  console.error("Quality audit blocked: src/data/questions.ts was not found.");
  process.exit(1);
}
const questions = readStaticArray(bankPath, "questions");
if (!Array.isArray(questions)) {
  console.error("Quality audit blocked: could not read the static question bank.");
  process.exit(1);
}

const requiredEvidence = [
  ["sourcePageRef", "original paper page reference"],
  ["questionTextChecked", "explicit question-text visual check"],
  ["optionsChecked", "explicit option/order visual check"],
  ["answerKeyChecked", "explicit official final-key check"],
  ["solutionIndependentlyChecked", "independent solution check"],
  ["diagramChecked", "explicit diagram check (use true when no diagram exists)"],
];
let blocked = 0;
console.log("MARKS question-quality evidence audit");
console.log("This checks recorded evidence only; it does not prove correctness.\n");

for (const q of questions) {
  if (!q || q.status !== "verified") continue;
  const missing = requiredEvidence.filter(([field]) => {
    if (field.endsWith("Checked")) return q[field] !== true;
    return typeof q[field] !== "string" || q[field].trim() === "";
  });
  const hasOriginalFallback = typeof q.originalPageImage === "string" && q.originalPageImage.trim() !== "";
  if (missing.length || !hasOriginalFallback) {
    blocked++;
    console.log(`BLOCKED ${q.id || "<missing-id>"}`);
    for (const [, label] of missing) console.log(`  - Missing evidence: ${label}`);
    if (!hasOriginalFallback) console.log("  - Missing original page image fallback reference");
  } else {
    console.log(`EVIDENCE COMPLETE ${q.id}`);
  }
}
console.log(`\nAudited ${questions.filter(q => q?.status === "verified").length} verified record(s); ${blocked} need evidence before meeting the new quality standard.`);
console.log("No question data was modified. Do not infer that a record is wrong solely because evidence fields are missing.");
if (process.argv.includes("--strict") && blocked > 0) process.exit(2);
