import type { Subject } from "@/data/demo";

export type QuestionStatus = "verified" | "unverified";
export type QuestionType = "mcq" | "numerical";

export type QuestionOption = { id: string; text: string };

export type Question = {
  id: string;
  subject: Subject;
  chapter: string;
  topic: string;
  year: number | null;
  shift: string;
  status: QuestionStatus;
  source: string;
  /** Required for verified official PYQs: direct official source URL. */
  sourceUrl?: string;
  /** ISO date (YYYY-MM-DD) when the source, question and answer were checked. */
  sourceCheckedAt?: string;
  /** Brief audit note naming what was cross-checked. */
  sourceNotes?: string;
  /** Exact official paper page reference, e.g. a PDF filename and page number. */
  sourcePageRef?: string;
  /** Stable reference/path for the original paper-page image fallback. */
  originalPageImage?: string;
  /** Explicit visual review checklist; required before status can be verified. */
  questionTextChecked?: boolean;
  optionsChecked?: boolean;
  answerKeyChecked?: boolean;
  solutionIndependentlyChecked?: boolean;
  /** Set true only after confirming the diagram, or confirming none is present. */
  diagramChecked?: boolean;
  prompt: string;
  type?: QuestionType;
  options: QuestionOption[];
  /** MCQ option ID, or expected numeric value as text for numerical questions. */
  answer: string;
  /** Allowed absolute error for numerical responses. Defaults to 0.001. */
  tolerance?: number;
  solution: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

export function isCorrectAnswer(question: Question, response: string | undefined): boolean {
  if (response === undefined || response.trim() === "") return false;
  if (question.type !== "numerical") return response === question.answer;
  const actual = Number(response.trim());
  const expected = Number(question.answer);
  const tolerance = question.tolerance ?? 0.001;
  return Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance;
}

const practiceSource = "Original demo practice question — not an official PYQ";

/**
 * Starter examples used to test the question engine.
 * Do not change status to "verified" unless the original official paper,
 * year, date, shift, question, and answer have all been checked.
 */
export const questions: Question[] = [
  {
    id: "jee-main-2026-04-02-shift-2-math-q2",
    subject: "Mathematics",
    chapter: "Complex Numbers & Quadratic Equations",
    topic: "Complex numbers and algebra",
    year: 2026,
    shift: "2 April 2026 Shift 2",
    status: "unverified",
    source: "NTA JEE Main 2026 Session 2 official paper and final answer key",
    sourceUrl: "https://jeemain.nta.nic.in/",
    sourceCheckedAt: "2026-10-12",
    sourceNotes: "Source question ID 691121152 checked against the original NTA paper PDF (https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2026/04/20260409481957146.pdf, PDF page 2). Correct option ID 691121517 matched against the NTA final answer key for 2 April 2026, Shift 2 (https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2026/04/20260420409057044.pdf). Prompt is paraphrased; original is available at the linked official paper.",
    prompt: "Two circles in the complex plane are given by |z| = r and |z − (3 + 4i)| = 5. The second circle lies entirely inside the first. If the minimum distance between points on their circumferences is 2, what is the maximum distance between points on the two circumferences?",
    options: [
      { id: "691121515", text: "12" },
      { id: "691121516", text: "17" },
      { id: "691121517", text: "22" },
      { id: "691121518", text: "24" },
    ],
    answer: "691121517",
    solution: "The centres are 5 units apart because |3 + 4i| = √(3² + 4²) = 5. The inner circle has radius 5. Since it lies inside the outer circle and the minimum circumference-to-circumference distance is 2, r − (5 + 5) = 2, so r = 12. The maximum distance is r + 5 + 5 = 22. The NTA final key identifies option ID 691121517, which is 22.",
    difficulty: "Medium",
  }
];
