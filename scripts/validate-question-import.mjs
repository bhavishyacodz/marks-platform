import fs from "node:fs";
import path from "node:path";

const explicitInput = process.argv[2];
let inputPath = path.resolve(explicitInput || "data/import/questions.json");
if (!explicitInput && !fs.existsSync(inputPath)) {
  inputPath = path.resolve("data/import/questions.template.json");
  console.log("No staging batch found; validating the template instead.");
}
if (!fs.existsSync(inputPath)) {
  console.error(`Import validation failed: ${inputPath} was not found.`);
  process.exit(1);
}

let items;
try {
  items = JSON.parse(fs.readFileSync(inputPath, "utf8"));
} catch (error) {
  console.error("Import validation failed: input must be valid JSON.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const errors = [];
const ids = new Set();
const allowedSubjects = new Set(["Physics", "Chemistry", "Mathematics"]);
const allowedDifficulties = new Set(["Easy", "Medium", "Hard"]);
const allowedStatuses = new Set(["verified", "unverified"]);
const officialHosts = new Set(["jeemain.nta.nic.in", "nta.ac.in", "www.nta.ac.in"]);
const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;
const issue = (id, message) => errors.push(`- ${id || "<unknown>"}: ${message}`);

if (!Array.isArray(items) || items.length === 0) {
  console.error("Import validation failed: provide a non-empty JSON array of question objects.");
  process.exit(1);
}

for (const [i, q] of items.entries()) {
  const label = nonEmpty(q?.id) ? q.id : `row #${i + 1}`;
  if (!q || typeof q !== "object" || Array.isArray(q)) {
    issue(label, "each entry must be an object.");
    continue;
  }
  for (const field of ["id", "chapter", "topic", "shift", "source", "prompt", "answer", "solution"]) {
    if (!nonEmpty(q[field])) issue(label, `'${field}' must be a non-empty string.`);
  }
  if (ids.has(q.id)) issue(label, "duplicate ID within this import file.");
  if (nonEmpty(q.id)) ids.add(q.id);
  if (!allowedSubjects.has(q.subject)) issue(label, "subject must be Physics, Chemistry, or Mathematics.");
  if (!allowedDifficulties.has(q.difficulty)) issue(label, "difficulty must be Easy, Medium, or Hard.");
  if (!allowedStatuses.has(q.status)) issue(label, "status must be verified or unverified.");
  if (q.year !== null && (!Number.isInteger(q.year) || q.year < 2000 || q.year > 2100)) issue(label, "year must be null or a four-digit year.");
  const type = q.type || "mcq";
  if (type !== "mcq" && type !== "numerical") issue(label, "type must be mcq or numerical.");
  if (!Array.isArray(q.options)) issue(label, "options must be an array.");
  else if (type === "numerical") {
    if (q.options.length !== 0) issue(label, "numerical questions must use an empty options array.");
    if (!nonEmpty(q.answer) || !Number.isFinite(Number(q.answer))) issue(label, "numerical answer must be a finite number stored as text.");
    if (q.tolerance !== null && q.tolerance !== undefined && (typeof q.tolerance !== "number" || !Number.isFinite(q.tolerance) || q.tolerance < 0)) issue(label, "tolerance must be null or a non-negative finite number.");
  } else if (type === "mcq" && Array.isArray(q.options)) {
    if (q.options.length < 2) issue(label, "MCQs need at least two options.");
    const optionIds = new Set();
    for (const option of q.options) {
      if (!nonEmpty(option?.id) || !nonEmpty(option?.text)) issue(label, "every option needs a non-empty id and text.");
      if (optionIds.has(option?.id)) issue(label, `duplicate option ID '${option?.id}'.`);
      if (nonEmpty(option?.id)) optionIds.add(option.id);
    }
    if (!optionIds.has(q.answer)) issue(label, "answer must match an option ID.");
  }
  if (q.status === "verified") {
    if (!Number.isInteger(q.year)) issue(label, "verified PYQs require an exam year.");
    if (!nonEmpty(q.sourceUrl)) issue(label, "verified PYQs require sourceUrl.");
    else {
      try {
        const u = new URL(q.sourceUrl);
        if (u.protocol !== "https:" || !officialHosts.has(u.hostname.toLowerCase())) issue(label, "sourceUrl must be HTTPS on an official NTA/JEE Main host.");
      } catch { issue(label, "sourceUrl must be a valid URL."); }
    }
    if (!nonEmpty(q.sourceCheckedAt) || !/^\\d{4}-\\d{2}-\\d{2}$/.test(q.sourceCheckedAt) || Number.isNaN(Date.parse(q.sourceCheckedAt))) issue(label, "verified PYQs require sourceCheckedAt in YYYY-MM-DD format.");
    if (!nonEmpty(q.sourceNotes)) issue(label, "verified PYQs require sourceNotes.");
  }
}

if (errors.length) {
  console.error(`Import validation failed with ${errors.length} issue(s):\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`Import validation passed: ${items.length} question(s) structurally checked. Check IDs against the existing bank and run syllabus validation before importing; this script does not prove source authenticity or answer correctness.`);
