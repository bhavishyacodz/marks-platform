# MARKS syllabus and question coverage audit

## Purpose

Use this checklist before describing the syllabus catalogue as complete or adding official JEE Main PYQs in bulk. A passing build or validator checks project structure; it does not independently establish syllabus completeness, question authenticity, or answer correctness.

## 1. Reconcile the syllabus

- [ ] Open the current official JEE Main Paper 1 syllabus from the NTA/JEE Main website.
- [ ] Record the syllabus year and the date checked.
- [ ] Compare Physics, Chemistry, and Mathematics chapter-by-chapter with `src/data/syllabus.ts`.
- [ ] Compare the subtopics and practical/experimental skills, not just chapter titles.
- [ ] Record any missing, extra, renamed, or merged topics before editing the catalogue.
- [ ] Keep this catalogue labelled as a starter until this review is complete.

Official starting points:
- JEE Main: https://jeemain.nta.nic.in/
- NTA: https://nta.ac.in/

## 2. Read the coverage report honestly

Run:

```bash
npm run report:coverage
```

For each subject, record:
- Total catalogue chapters.
- Chapters with at least one question.
- Chapters with zero questions.
- Topics with zero questions.

A topic with zero questions is a content gap, not a validation failure. A chapter with one question is not necessarily well covered. The report measures presence, not depth, difficulty balance, or official-PYQ completeness.

## 3. Add questions in safe batches

For each batch:

1. Prefer one clearly defined topic at a time.
2. Use `data/import/questions.template.json` as the schema reference.
3. Keep original practice questions marked `unverified` and label them as original practice.
4. Never invent a year, exam date, shift, or official source URL.
5. For an official PYQ, cross-check the question and answer against an official paper or answer key, then fill the provenance fields required by the validator.
6. Keep a short audit note describing what was checked.

Validate a staged batch before importing it:

```bash
npm run validate:import -- data/import/questions.json
npm run validate
npm run build
```

The import validator checks structure and metadata; it cannot prove that a question really appeared in the cited exam or that its solution is mathematically correct. Those checks require human review against the source.

## 4. Release checklist

- [ ] Catalogue reconciled against the intended official syllabus year.
- [ ] Coverage report reviewed and largest gaps prioritised.
- [ ] Every new question has a unique ID and a checked answer/solution.
- [ ] Official PYQs have direct official provenance and remain clearly distinguished from practice questions.
- [ ] `npm run validate:import` passes for each staged batch.
- [ ] `npm run validate` passes.
- [ ] `npm run build` passes.
- [ ] Public-facing claims match the evidence actually reviewed.
