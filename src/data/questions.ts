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
    id: "demo-phy-lens-001", subject: "Physics", chapter: "Optics", topic: "Thin lens formula",
    year: null, shift: "Demo practice", status: "unverified", source: practiceSource, difficulty: "Medium",
    prompt: "A convex lens has focal length 20 cm. An object is placed 30 cm in front of the lens. Using the Cartesian sign convention, where is the image formed?",
    options: [
      { id: "a", text: "60 cm on the other side of the lens" },
      { id: "b", text: "60 cm on the same side as the object" },
      { id: "c", text: "12 cm on the other side of the lens" },
      { id: "d", text: "At infinity" },
    ],
    answer: "a",
    solution: "Using 1/f = 1/v − 1/u, f = +20 cm and u = −30 cm. So 1/v = 1/20 − 1/30 = 1/60, hence v = +60 cm. The positive distance places the image on the opposite side.",
  },
  {
    id: "demo-math-quad-001", subject: "Mathematics", chapter: "Complex Numbers & Quadratic Equations", topic: "Discriminant",
    year: null, shift: "Demo practice", status: "unverified", source: practiceSource, difficulty: "Easy",
    prompt: "For the quadratic equation x² − 6x + k = 0 to have equal real roots, what is k?",
    options: [
      { id: "a", text: "6" }, { id: "b", text: "9" }, { id: "c", text: "12" }, { id: "d", text: "−9" },
    ],
    answer: "b",
    solution: "Equal real roots require the discriminant to be zero: b² − 4ac = 0. Here 36 − 4k = 0, so k = 9.",
  },
  {
    id: "demo-chem-bond-001", subject: "Chemistry", chapter: "Chemical Bonding", topic: "Molecular shape",
    year: null, shift: "Demo practice", status: "unverified", source: practiceSource, difficulty: "Easy",
    prompt: "According to VSEPR theory, what is the molecular shape of CH₄?",
    options: [
      { id: "a", text: "Trigonal planar" }, { id: "b", text: "Tetrahedral" }, { id: "c", text: "Linear" }, { id: "d", text: "Bent" },
    ],
    answer: "b",
    solution: "Carbon has four bonding pairs and no lone pairs in CH₄. The four electron pairs arrange tetrahedrally, giving a tetrahedral molecular shape.",
  },
  {
    id: "demo-math-numerical-001", subject: "Mathematics", chapter: "Complex Numbers & Quadratic Equations", topic: "Numerical answer input",
    year: null, shift: "Demo practice", status: "unverified", source: practiceSource, difficulty: "Easy", type: "numerical",
    prompt: "If x² = 49 and x is positive, enter the value of x.", options: [], answer: "7", tolerance: 0,
    solution: "Since x² = 49, x = ±7. The question specifies that x is positive, so the answer is 7.",
  },
];
