import type { Subject } from "@/data/demo";

/**
 * JEE Main Paper 1 syllabus catalogue starter.
 * Chapter names are aligned to the NTA JEE Main 2026 syllabus headings where practical.
 * This is a navigation catalogue, not a substitute for the official syllabus PDF.
 * Topic coverage should be checked against the current official syllabus before publishing.
 */
export type SyllabusTopic = {
  id: string;
  subject: Subject;
  chapter: string;
  topics: string[];
};

export const syllabusCatalogue: SyllabusTopic[] = [
  { id: "phy-units-measurements", subject: "Physics", chapter: "Units & Measurements", topics: ["Units and systems of units", "SI units", "Least count", "Significant figures", "Errors in measurement", "Dimensions and dimensional analysis"] },
  { id: "phy-kinematics", subject: "Physics", chapter: "Kinematics", topics: ["Frame of reference", "Straight-line motion", "Position, velocity and acceleration", "Uniform and non-uniform motion", "Graphs of motion", "Scalars and vectors", "Projectile motion", "Uniform circular motion"] },
  { id: "phy-laws-motion", subject: "Physics", chapter: "Laws of Motion", topics: ["Newton's laws", "Momentum and impulse", "Conservation of momentum", "Equilibrium of concurrent forces", "Friction", "Circular dynamics"] },
  { id: "phy-work-energy-power", subject: "Physics", chapter: "Work, Energy & Power", topics: ["Work by constant and variable forces", "Kinetic and potential energy", "Work-energy theorem", "Power", "Conservation of mechanical energy", "Collisions"] },
  { id: "phy-rotation", subject: "Physics", chapter: "Rotational Motion", topics: ["Centre of mass", "Torque", "Angular momentum", "Moment of inertia", "Parallel and perpendicular axis theorems", "Rigid-body equilibrium", "Rotational dynamics"] },
  { id: "phy-gravitation", subject: "Physics", chapter: "Gravitation", topics: ["Universal law of gravitation", "Variation of gravity", "Gravitational potential and energy", "Escape velocity", "Orbital velocity", "Satellites and Kepler's laws"] },
  { id: "phy-properties-matter", subject: "Physics", chapter: "Properties of Solids & Liquids", topics: ["Elasticity", "Pressure and fluid statics", "Pascal's law", "Buoyancy", "Viscosity", "Surface tension", "Heat and temperature", "Calorimetry", "Heat transfer"] },
  { id: "phy-thermodynamics", subject: "Physics", chapter: "Thermodynamics", topics: ["Thermal equilibrium", "Zeroth law", "First law", "Internal energy and work", "Isothermal and adiabatic processes", "Second law", "Heat engines and refrigerators"] },
  { id: "phy-kinetic-theory", subject: "Physics", chapter: "Kinetic Theory of Gases", topics: ["Ideal gas equation", "Kinetic interpretation of temperature", "RMS speed", "Degrees of freedom", "Equipartition of energy", "Specific heat capacities", "Mean free path"] },
  { id: "phy-oscillations-waves", subject: "Physics", chapter: "Oscillations & Waves", topics: ["Simple harmonic motion", "Energy in SHM", "Simple pendulum", "Wave motion", "Longitudinal and transverse waves", "Superposition", "Standing waves", "Beats"] },
  { id: "phy-electrostatics", subject: "Physics", chapter: "Electrostatics", topics: ["Electric charge and Coulomb's law", "Electric field", "Electric dipole", "Electric flux and Gauss's law", "Electric potential", "Potential energy", "Conductors and dielectrics", "Capacitance and capacitors"] },
  { id: "phy-current-electricity", subject: "Physics", chapter: "Current Electricity", topics: ["Electric current", "Drift velocity", "Ohm's law", "Resistance and resistivity", "Series and parallel circuits", "Temperature dependence", "Electrical power", "Cells and internal resistance", "Kirchhoff's laws", "Wheatstone bridge"] },
  { id: "phy-magnetism", subject: "Physics", chapter: "Magnetic Effects of Current & Magnetism", topics: ["Biot–Savart law", "Ampere's law", "Force on a moving charge", "Force on a current-carrying conductor", "Torque on a current loop", "Moving-coil galvanometer", "Magnetic dipole", "Magnetic materials"] },
  { id: "phy-induction-ac", subject: "Physics", chapter: "Electromagnetic Induction & AC", topics: ["Faraday's law", "Lenz's law", "Induced emf and current", "Self and mutual inductance", "Alternating current", "Reactance and impedance", "LCR circuits", "Resonance", "Transformer"] },
  { id: "phy-em-waves", subject: "Physics", chapter: "Electromagnetic Waves", topics: ["Displacement current", "Properties of electromagnetic waves", "Electromagnetic spectrum and applications"] },
  { id: "phy-optics", subject: "Physics", chapter: "Optics", topics: ["Reflection and spherical mirrors", "Refraction", "Total internal reflection", "Lenses and lens formula", "Lens maker's formula", "Prism", "Optical instruments", "Huygens principle", "Interference", "Diffraction", "Polarisation"] },
  { id: "phy-modern", subject: "Physics", chapter: "Dual Nature of Matter & Radiation", topics: ["Photoelectric effect", "Einstein's equation", "Matter waves", "de Broglie wavelength"] },
  { id: "phy-atoms-nuclei", subject: "Physics", chapter: "Atoms & Nuclei", topics: ["Rutherford model", "Bohr model", "Hydrogen spectrum", "Nuclear composition and size", "Mass defect and binding energy", "Radioactivity", "Fission and fusion"] },
  { id: "phy-electronic-devices", subject: "Physics", chapter: "Electronic Devices", topics: ["Semiconductors", "p-n junction diode", "Forward and reverse bias", "Diode characteristics", "Rectifier", "LED and photodiode", "Solar cell", "Zener diode", "Logic gates"] },
  { id: "phy-experimental-skills", subject: "Physics", chapter: "Experimental Skills", topics: ["Vernier calipers", "Screw gauge", "Simple pendulum", "Metre bridge", "Resistance and resistivity experiments", "Optical bench", "Diode characteristics", "Specific heat capacity", "Focal length measurements"] },

  { id: "chem-basic-concepts", subject: "Chemistry", chapter: "Some Basic Concepts in Chemistry", topics: ["Matter and its nature", "Laws of chemical combination", "Atomic and molecular masses", "Mole concept", "Molar mass", "Percentage composition", "Empirical and molecular formulae", "Stoichiometry"] },
  { id: "chem-atomic-structure", subject: "Chemistry", chapter: "Atomic Structure", topics: ["Electromagnetic radiation", "Photoelectric effect", "Bohr model", "Hydrogen spectrum", "Wave-particle duality", "Quantum numbers", "Orbitals and shapes", "Aufbau principle", "Pauli exclusion principle", "Hund's rule"] },
  { id: "chem-chemical-bonding", subject: "Chemistry", chapter: "Chemical Bonding", topics: ["Ionic and covalent bonds", "Lewis structures", "Formal charge", "VSEPR theory", "Valence bond theory", "Hybridisation", "Molecular orbital theory", "Bond order", "Hydrogen bonding"] },
  { id: "chem-thermodynamics", subject: "Chemistry", chapter: "Chemical Thermodynamics", topics: ["System and surroundings", "First law", "Internal energy and enthalpy", "Heat capacity", "Hess's law", "Enthalpy changes", "Entropy", "Gibbs energy and spontaneity"] },
  { id: "chem-solutions", subject: "Chemistry", chapter: "Solutions", topics: ["Concentration terms", "Solubility", "Raoult's law", "Ideal and non-ideal solutions", "Colligative properties", "Van't Hoff factor"] },
  { id: "chem-equilibrium", subject: "Chemistry", chapter: "Equilibrium", topics: ["Dynamic equilibrium", "Equilibrium constants", "Le Chatelier principle", "Acids and bases", "pH", "Buffer solutions", "Hydrolysis of salts", "Solubility product"] },
  { id: "chem-redox-electrochem", subject: "Chemistry", chapter: "Redox Reactions & Electrochemistry", topics: ["Oxidation numbers", "Balancing redox reactions", "Electrochemical cells", "Electrode potential", "Nernst equation", "Conductance", "Kohlrausch's law", "Electrolysis", "Batteries and fuel cells"] },
  { id: "chem-kinetics", subject: "Chemistry", chapter: "Chemical Kinetics", topics: ["Rate of reaction", "Rate law", "Order and molecularity", "Integrated rate equations", "Half-life", "Arrhenius equation", "Activation energy"] },
  { id: "chem-periodicity", subject: "Chemistry", chapter: "Periodic Table & Periodicity", topics: ["Modern periodic law", "Electronic configuration", "Atomic and ionic radii", "Ionisation enthalpy", "Electron gain enthalpy", "Electronegativity", "Periodic trends"] },
  { id: "chem-p-block", subject: "Chemistry", chapter: "p-Block Elements", topics: ["Groups 13–18", "Electronic configuration", "Periodic trends", "Important compounds and reactions included in the current syllabus"] },
  { id: "chem-df-block", subject: "Chemistry", chapter: "d- and f-Block Elements", topics: ["Electronic configurations", "Transition-element properties", "Oxidation states", "Colour and magnetism", "Catalytic properties", "Lanthanoids", "Actinoids"] },
  { id: "chem-coordination", subject: "Chemistry", chapter: "Coordination Compounds", topics: ["Ligands and coordination number", "Nomenclature", "Isomerism", "Werner theory", "Valence bond theory", "Crystal field theory", "Colour and magnetic properties"] },
  { id: "chem-purification", subject: "Chemistry", chapter: "Purification & Characterisation of Organic Compounds", topics: ["Crystallisation", "Sublimation", "Distillation", "Differential extraction", "Chromatography", "Qualitative analysis", "Quantitative analysis"] },
  { id: "chem-organic-basics", subject: "Chemistry", chapter: "Some Basic Principles of Organic Chemistry", topics: ["Tetravalency and hybridisation", "Functional groups", "IUPAC nomenclature", "Structural isomerism", "Inductive effect", "Resonance", "Hyperconjugation", "Reaction intermediates", "Electrophiles and nucleophiles", "Reaction types"] },
  { id: "chem-hydrocarbons", subject: "Chemistry", chapter: "Hydrocarbons", topics: ["Alkanes", "Alkenes", "Alkynes", "Aromatic hydrocarbons", "Conformations", "Important reactions and mechanisms"] },
  { id: "chem-halogen-compounds", subject: "Chemistry", chapter: "Organic Compounds Containing Halogens", topics: ["Nomenclature", "C–X bond", "Preparation and reactions", "Nucleophilic substitution", "Environmental effects of selected compounds"] },
  { id: "chem-oxygen-compounds", subject: "Chemistry", chapter: "Organic Compounds Containing Oxygen", topics: ["Alcohols and phenols", "Ethers", "Aldehydes and ketones", "Carboxylic acids", "Preparation and properties", "Important reactions"] },
  { id: "chem-nitrogen-compounds", subject: "Chemistry", chapter: "Organic Compounds Containing Nitrogen", topics: ["Amines", "Nomenclature", "Basicity", "Preparation and reactions", "Diazonium salts where included"] },
  { id: "chem-biomolecules", subject: "Chemistry", chapter: "Biomolecules", topics: ["Carbohydrates", "Proteins", "Amino acids", "Enzymes", "Vitamins", "Nucleic acids", "Hormones included in the syllabus"] },
  { id: "chem-practical", subject: "Chemistry", chapter: "Principles Related to Practical Chemistry", topics: ["Salt analysis", "Functional-group tests", "Titrations", "Preparation of inorganic compounds", "Chemistry of materials and experiments listed by NTA"] },

  { id: "math-sets-functions", subject: "Mathematics", chapter: "Sets, Relations & Functions", topics: ["Sets and operations", "Relations", "Equivalence relations", "Functions", "Domain and range", "Composition of functions", "Inverse functions"] },
  { id: "math-complex-quadratic", subject: "Mathematics", chapter: "Complex Numbers & Quadratic Equations", topics: ["Complex numbers and algebra", "Argand plane", "Modulus and argument", "Square root of complex numbers", "Quadratic equations", "Nature of roots", "Relations between roots and coefficients"] },
  { id: "math-matrices-determinants", subject: "Mathematics", chapter: "Matrices & Determinants", topics: ["Types of matrices", "Matrix operations", "Transpose", "Determinants", "Inverse of a matrix", "Adjoint", "Solving linear equations"] },
  { id: "math-permutations-combinations", subject: "Mathematics", chapter: "Permutations & Combinations", topics: ["Fundamental counting principle", "Permutations", "Combinations", "Arrangements with restrictions"] },
  { id: "math-binomial", subject: "Mathematics", chapter: "Binomial Theorem", topics: ["Binomial expansion", "General term", "Middle term", "Binomial coefficients"] },
  { id: "math-sequences-series", subject: "Mathematics", chapter: "Sequence & Series", topics: ["Arithmetic progression", "Geometric progression", "Arithmetic and geometric means", "Sum of series", "Special sums"] },
  { id: "math-calculus", subject: "Mathematics", chapter: "Limits, Continuity & Differentiability", topics: ["Limits", "Continuity", "Differentiability", "Differentiation rules", "Implicit differentiation", "Logarithmic differentiation", "Rolle's theorem", "Mean value theorem", "Monotonicity", "Maxima and minima"] },
  { id: "math-integral-calculus", subject: "Mathematics", chapter: "Integral Calculus", topics: ["Indefinite integration", "Integration by substitution", "Integration by parts", "Partial fractions", "Definite integrals", "Properties of definite integrals", "Area under curves"] },
  { id: "math-differential-equations", subject: "Mathematics", chapter: "Differential Equations", topics: ["Order and degree", "Formation of differential equations", "Separation of variables", "Homogeneous differential equations", "First-order linear differential equations"] },
  { id: "math-coordinate-geometry", subject: "Mathematics", chapter: "Coordinate Geometry", topics: ["Straight lines", "Pair of straight lines where included", "Circle", "Parabola", "Ellipse", "Hyperbola"] },
  { id: "math-3d-geometry", subject: "Mathematics", chapter: "Three Dimensional Geometry", topics: ["Coordinates in space", "Distance and section formulae", "Direction ratios and cosines", "Lines in space", "Angle between lines", "Skew lines and shortest distance where included"] },
  { id: "math-vector-algebra", subject: "Mathematics", chapter: "Vector Algebra", topics: ["Vectors and components", "Addition and scalar multiplication", "Dot product", "Cross product", "Applications to geometry"] },
  { id: "math-statistics-probability", subject: "Mathematics", chapter: "Statistics & Probability", topics: ["Mean, median and mode", "Variance and standard deviation", "Probability", "Conditional probability", "Bayes theorem", "Random variables where included"] },
  { id: "math-trigonometry", subject: "Mathematics", chapter: "Trigonometry", topics: ["Trigonometric identities", "Trigonometric equations", "Inverse trigonometric functions", "Properties and principal values"] },
];
