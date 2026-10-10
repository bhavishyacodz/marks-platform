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
    id: "demo-phy-lens-001", subject: "Physics", chapter: "Optics", topic: "Lenses and lens formula",
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
    id: "demo-math-quad-001", subject: "Mathematics", chapter: "Complex Numbers & Quadratic Equations", topic: "Quadratic equations",
    year: null, shift: "Demo practice", status: "unverified", source: practiceSource, difficulty: "Easy",
    prompt: "For the quadratic equation x² − 6x + k = 0 to have equal real roots, what is k?",
    options: [
      { id: "a", text: "6" }, { id: "b", text: "9" }, { id: "c", text: "12" }, { id: "d", text: "−9" },
    ],
    answer: "b",
    solution: "Equal real roots require the discriminant to be zero: b² − 4ac = 0. Here 36 − 4k = 0, so k = 9.",
  },
  {
    id: "demo-chem-bond-001", subject: "Chemistry", chapter: "Chemical Bonding", topic: "VSEPR theory",
    year: null, shift: "Demo practice", status: "unverified", source: practiceSource, difficulty: "Easy",
    prompt: "According to VSEPR theory, what is the molecular shape of CH₄?",
    options: [
      { id: "a", text: "Trigonal planar" }, { id: "b", text: "Tetrahedral" }, { id: "c", text: "Linear" }, { id: "d", text: "Bent" },
    ],
    answer: "b",
    solution: "Carbon has four bonding pairs and no lone pairs in CH₄. The four electron pairs arrange tetrahedrally, giving a tetrahedral molecular shape.",
  },
  {
    id: "demo-math-numerical-001", subject: "Mathematics", chapter: "Complex Numbers & Quadratic Equations", topic: "Quadratic equations",
    year: null, shift: "Demo practice", status: "unverified", source: practiceSource, difficulty: "Easy", type: "numerical",
    prompt: "If x² = 49 and x is positive, enter the value of x.", options: [], answer: "7", tolerance: 0,
    solution: "Since x² = 49, x = ±7. The question specifies that x is positive, so the answer is 7.",
  },

  {
    id: "practice-phy-optics-002", subject: "Physics", chapter: "Optics", topic: "Refraction",
    year: null, shift: "Original practice", status: "unverified", source: practiceSource, difficulty: "Easy",
    prompt: "Light travels from air into glass of refractive index 1.5 at an angle of incidence of 30°. What is the sine of the angle of refraction?",
    options: [
      { id: "a", text: "1/3" }, { id: "b", text: "1/2" }, { id: "c", text: "√3/2" }, { id: "d", text: "3/4" },
    ],
    answer: "a",
    solution: "By Snell's law, n₁ sin i = n₂ sin r. Taking n₁ ≈ 1, sin r = sin 30° / 1.5 = (1/2)/(3/2) = 1/3.",
  },
  {
    id: "practice-phy-optics-003", subject: "Physics", chapter: "Optics", topic: "Total internal reflection",
    year: null, shift: "Original practice", status: "unverified", source: practiceSource, difficulty: "Medium",
    prompt: "A ray travels from glass (refractive index 1.5) toward air. What is the approximate critical angle?",
    options: [
      { id: "a", text: "30°" }, { id: "b", text: "42°" }, { id: "c", text: "60°" }, { id: "d", text: "90°" },
    ],
    answer: "b",
    solution: "For a glass-to-air boundary, sin C = n_air/n_glass = 1/1.5 = 2/3. Thus C = sin⁻¹(2/3) ≈ 41.8°, or about 42°.",
  },
  {
    id: "practice-chem-bond-002", subject: "Chemistry", chapter: "Chemical Bonding", topic: "Hybridisation",
    year: null, shift: "Original practice", status: "unverified", source: practiceSource, difficulty: "Easy",
    prompt: "What is the hybridisation of the central carbon atom in CH₄?",
    options: [
      { id: "a", text: "sp" }, { id: "b", text: "sp²" }, { id: "c", text: "sp³" }, { id: "d", text: "dsp²" },
    ],
    answer: "c",
    solution: "Carbon forms four equivalent sigma bonds in methane. Four electron domains correspond to tetrahedral geometry and sp³ hybridisation.",
  },
  {
    id: "practice-chem-basic-001", subject: "Chemistry", chapter: "Some Basic Concepts in Chemistry", topic: "Mole concept",
    year: null, shift: "Original practice", status: "unverified", source: practiceSource, difficulty: "Easy",
    prompt: "How many moles are present in 18 g of water (H₂O)? Use molar mass = 18 g mol⁻¹.",
    options: [
      { id: "a", text: "0.5 mol" }, { id: "b", text: "1 mol" }, { id: "c", text: "2 mol" }, { id: "d", text: "18 mol" },
    ],
    answer: "b",
    solution: "Number of moles = given mass / molar mass = 18 g / (18 g mol⁻¹) = 1 mol.",
  },
  {
    id: "practice-math-quad-002", subject: "Mathematics", chapter: "Complex Numbers & Quadratic Equations", topic: "Nature of roots",
    year: null, shift: "Original practice", status: "unverified", source: practiceSource, difficulty: "Easy",
    prompt: "What is the nature of the roots of x² + 4x + 5 = 0?",
    options: [
      { id: "a", text: "Two distinct real roots" }, { id: "b", text: "Equal real roots" }, { id: "c", text: "A pair of non-real complex conjugates" }, { id: "d", text: "One zero root" },
    ],
    answer: "c",
    solution: "The discriminant is D = b² − 4ac = 16 − 20 = −4. Since D < 0, the equation has two non-real complex conjugate roots.",
  },
  {
    id: "practice-math-coordinate-001", subject: "Mathematics", chapter: "Coordinate Geometry", topic: "Parabola",
    year: null, shift: "Original practice", status: "unverified", source: practiceSource, difficulty: "Easy",
    prompt: "For the parabola y² = 8x, what is the value of the focal parameter a in the standard form y² = 4ax?",
    options: [
      { id: "a", text: "1" }, { id: "b", text: "2" }, { id: "c", text: "4" }, { id: "d", text: "8" },
    ],
    answer: "b",
    solution: "Compare y² = 8x with y² = 4ax. Then 4a = 8, so a = 2.",
  },
];
