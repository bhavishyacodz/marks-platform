import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const auditScript = path.resolve("scripts/audit-question-quality.mjs");

function runAudit(questionFields) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marks-quality-audit-"));
  try {
    const dataDir = path.join(tempDir, "src", "data");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, "questions.ts"),
      `const questions = [${JSON.stringify({
        id: "fixture-question",
        status: "verified",
        sourcePageRef: "official-paper.pdf#page=1",
        originalPageImage: "paper-page-001.png",
        questionTextChecked: true,
        optionsChecked: true,
        answerKeyChecked: true,
        solutionIndependentlyChecked: true,
        diagramChecked: true,
        ...questionFields,
      })}];\nexport { questions };\n`,
    );
    return spawnSync(process.execPath, [auditScript, "--strict"], {
      cwd: tempDir,
      encoding: "utf8",
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("accepts a verified question when every evidence boolean is true", () => {
  const result = runAudit({});
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /EVIDENCE COMPLETE fixture-question/);
});

test("blocks a verified question when an evidence boolean is false", () => {
  const result = runAudit({ answerKeyChecked: false });
  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.match(result.stdout, /Missing evidence: explicit official final-key check/);
});

test("blocks a verified question when an evidence boolean is missing", () => {
  const result = runAudit({ diagramChecked: undefined });
  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.match(result.stdout, /Missing evidence: explicit diagram check/);
});
