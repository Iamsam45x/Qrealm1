import type { Phase } from "@/components/phase-section"

export const quantumPhysicsPhases: Phase[] = [
  {
    number: 1,
    title: "Foundations of Modern Physics",
    description:
      "Understand why classical physics reached its limits and how the seeds of quantum theory were planted through thermodynamics and relativity.",
    chapters: [
      {
        number: 1,
        title: "Introduction to Modern Physics",
        topics: [
          { label: "Failure of classical physics" },
          { label: "Birth of modern ideas" },
          { label: "Why quantum theory was required" },
        ],
      },
      {
        number: 2,
        title: "Thermodynamics (Bridge Chapter)",
        topics: [
          { label: "Energy, entropy, irreversibility" },
          { label: "Microscopic vs macroscopic view" },
          { label: "Seeds of probability" },
        ],
      },
      {
        number: 3,
        title: "Einstein's Relativity & Findings",
        topics: [
          { label: "Space-time" },
          { label: "Mass-energy equivalence" },
          { label: "Photoelectric effect" },
        ],
      },
    ],
  },
  {
    number: 2,
    title: "Mathematical & Wave Function Intuition",
    description:
      "Develop an intuitive understanding of wave-particle duality, probability amplitudes, and the meaning of quantum states.",
    chapters: [
      {
        number: 4,
        title: "De Broglie Theory",
        topics: [
          { label: "Matter waves" },
          { label: "Experimental evidence" },
          { label: "Philosophical implications" },
        ],
      },
      {
        number: 5,
        title: "Probability Density & \u03C8",
        topics: [
          { label: "Probability amplitude" },
          { label: "Physical meaning" },
          { label: "Classical vs quantum probability" },
        ],
      },
      {
        number: 6,
        title: "Quantum States",
        topics: [
          { label: "State vectors" },
          { label: "Superposition" },
          { label: "Meaning of a state" },
        ],
      },
    ],
  },
  {
    number: 3,
    title: "Core Quantum Mechanics",
    description:
      "Engage with the mathematical formalism of quantum mechanics: the Schr\u00F6dinger equation, normalisation, and the eigenvalue problem.",
    chapters: [
      {
        number: 7,
        title: "Schr\u00F6dinger Equation",
        topics: [
          { label: "Time-dependent & independent forms" },
          { label: "Postulates" },
          { label: "Interpretation" },
          { label: "Boundary conditions" },
        ],
      },
      {
        number: 8,
        title: "Normalisation",
        topics: [
          { label: "Why it is required" },
          { label: "Mathematical & physical meaning" },
        ],
      },
      {
        number: 9,
        title: "Eigenvalues & Eigenfunctions",
        topics: [
          { label: "Operators" },
          { label: "Observables" },
          { label: "Measurement" },
        ],
      },
    ],
  },
  {
    number: 4,
    title: "Model Systems",
    description:
      "Apply quantum mechanics to idealised systems and understand how energy quantisation emerges from boundary conditions.",
    chapters: [
      {
        number: 10,
        title: "Finite & Infinite Potential Wells",
        topics: [
          { label: "Particle in a box" },
          { label: "Energy quantisation" },
          { label: "Real-world relevance" },
        ],
      },
    ],
  },
  {
    number: 5,
    title: "Measurement & Interpretation",
    description:
      "Confront the measurement problem and explore the philosophical interpretations that attempt to explain quantum phenomena.",
    chapters: [
      {
        number: 11,
        title: "Quantum Measurement",
        topics: [
          { label: "Measurement postulate" },
          { label: "Wave function collapse" },
          { label: "Observer problem" },
        ],
      },
      {
        number: 12,
        title: "Interpretations",
        topics: [
          { label: "Copenhagen" },
          { label: "Many-Worlds" },
          { label: "Pilot-Wave" },
          { label: "Consciousness debate" },
        ],
      },
    ],
  },
  {
    number: 6,
    title: "Non-Locality & Entanglement",
    description:
      "Explore the puzzling phenomena of quantum non-locality and entanglement that challenge our deepest assumptions about reality.",
    chapters: [
      {
        number: 13,
        title: "EPR Paradox",
        topics: [{ label: "Local realism" }],
      },
      {
        number: 14,
        title: "Quantum Entanglement",
        topics: [
          { label: "Bell's theorem" },
          { label: "Experimental proof" },
          { label: "Philosophical consequences" },
        ],
      },
    ],
  },
  {
    number: 7,
    title: "Quantum Technologies",
    description:
      "See how quantum principles are harnessed for computing, communication, and security in real-world technologies.",
    chapters: [
      {
        number: 15,
        title: "Qubits",
        topics: [
          { label: "Classical vs quantum bits" },
          { label: "Superposition & entanglement" },
        ],
      },
      {
        number: 16,
        title: "Quantum Computing",
        topics: [
          { label: "Gates" },
          { label: "Algorithms" },
          { label: "Future impact" },
        ],
      },
      {
        number: 17,
        title: "Quantum Cryptography",
        topics: [
          { label: "Quantum key distribution" },
          { label: "Physics-based security" },
        ],
      },
    ],
  },
  {
    number: 8,
    title: "Particles & Fields",
    description:
      "Journey into quantum field theory, where particles are excitations of underlying fields and the standard model begins to take shape.",
    chapters: [
      {
        number: 18,
        title: "Antimatter",
        topics: [
          { label: "Dirac equation" },
          { label: "Symmetry" },
        ],
      },
      {
        number: 19,
        title: "Quantum Electrodynamics",
        topics: [
          { label: "Light-matter interaction" },
          { label: "Virtual particles" },
        ],
      },
      {
        number: 20,
        title: "Quantum Field Theory",
        topics: [
          { label: "Fields as fundamental" },
          { label: "Particles as excitations" },
        ],
      },
    ],
  },
]
