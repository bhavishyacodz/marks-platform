import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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

const syllabusPath = path.resolve("src/data/syllabus.ts");
const questionsPath = path.resolve("src/data/questions.ts");
for (const file of [syllabusPath, questionsPath]) {
  if (!fs.existsSync(file)) {
    console.error("Coverage report failed: missing " + path.relative(process.cwd(), file));
    process.exit(1);
  }
}
const chapters = readStaticArray(syllabusPath, "syllabusCatalogue");
const questions = readStaticArray(questionsPath, "questions");
if (!Array.isArray(chapters) || !Array.isArray(questions)) {
  console.error("Coverage report failed: could not read syllabus catalogue or question bank.");
  process.exit(1);
}

const byChapter = new Map();
const byTopic = new Map();
for (const q of questions) {
  const chapterKey = q.subject + "::" + q.chapter;
  byChapter.set(chapterKey, (byChapter.get(chapterKey) || 0) + 1);
  const topicKey = chapterKey + "::" + q.topic;
  byTopic.set(topicKey, (byTopic.get(topicKey) || 0) + 1);
}

const counts = { Physics: { chapters: 0, withQuestions: 0, questions: 0, uncoveredTopics: 0 }, Chemistry: { chapters: 0, withQuestions: 0, questions: 0, uncoveredTopics: 0 }, Mathematics: { chapters: 0, withQuestions: 0, questions: 0, uncoveredTopics: 0 } };
const uncoveredChapters = [];
const uncoveredTopics = [];
for (const chapter of chapters) {
  const subject = counts[chapter.subject];
  if (!subject) continue;
  subject.chapters += 1;
  const key = chapter.subject + "::" + chapter.chapter;
  const count = byChapter.get(key) || 0;
  subject.questions += count;
  if (count > 0) subject.withQuestions += 1;
  else uncoveredChapters.push({ subject: chapter.subject, chapter: chapter.chapter });
  for (const topic of chapter.topics || []) {
    if (!(byTopic.get(key + "::" + topic) > 0)) {
      subject.uncoveredTopics += 1;
      uncoveredTopics.push({ subject: chapter.subject, chapter: chapter.chapter, topic });
    }
  }
}

console.log("MARKS question-bank coverage (current catalogue only)");
console.log("This is a coverage snapshot, not a measure of official PYQ completeness.");
console.log("");
for (const subject of ["Physics", "Chemistry", "Mathematics"]) {
  const s = counts[subject];
  console.log(subject + ": " + s.questions + " questions across " + s.withQuestions + "/" + s.chapters + " chapters; " + s.uncoveredTopics + " catalogue topics have no question.");
}
console.log("");
console.log("Chapters with zero questions:");
if (uncoveredChapters.length === 0) console.log("- none");
else for (const c of uncoveredChapters) console.log("- " + c.subject + " / " + c.chapter);
console.log("");
console.log("Topics with zero questions (" + uncoveredTopics.length + "):");
for (const t of uncoveredTopics) console.log("- " + t.subject + " / " + t.chapter + " / " + t.topic);
