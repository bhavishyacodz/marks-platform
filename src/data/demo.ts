export type Subject = "Physics" | "Chemistry" | "Mathematics";

export const subjects: { name: Subject; short: string; count: number }[] = [
  { name: "Physics", short: "PHY", count: 24 },
  { name: "Chemistry", short: "CHEM", count: 31 },
  { name: "Mathematics", short: "MATH", count: 27 },
];

export const chapters = [
  { name: "Units & Measurements", subject: "Physics", questions: 18, progress: 35 },
  { name: "Motion in a Straight Line", subject: "Physics", questions: 26, progress: 12 },
  { name: "Laws of Motion", subject: "Physics", questions: 32, progress: 0 },
  { name: "Thermodynamics", subject: "Physics", questions: 29, progress: 58 },
  { name: "Chemical Bonding", subject: "Chemistry", questions: 41, progress: 24 },
  { name: "Quadratic Equations", subject: "Mathematics", questions: 36, progress: 46 },
];

export const demoQuestion = {
  id: "demo-phy-lens-001",
  subject: "Physics" as const,
  chapter: "Ray Optics",
  topic: "Thin lens formula",
  prompt: "A convex lens has focal length 20 cm. An object is placed 30 cm in front of the lens. Using the Cartesian sign convention, where is the image formed?",
  options: [
    { id: "a", text: "60 cm on the other side of the lens" },
    { id: "b", text: "60 cm on the same side as the object" },
    { id: "c", text: "12 cm on the other side of the lens" },
    { id: "d", text: "At infinity" },
  ],
  correctOptionId: "a",
  explanation: "Using 1/f = 1/v − 1/u, with f = +20 cm and u = −30 cm: 1/v = 1/20 − 1/30 = 1/60, so v = +60 cm. The positive image distance means the image is on the opposite side of the lens.",
  sourceLabel: "Demo question — not an official PYQ",
};
