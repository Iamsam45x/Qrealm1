"use client"

import { useEffect, useRef } from "react"

/* ==== Bloch Sphere SVG (minimal wireframe) ==== */
function BlochSphere() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full max-h-[260px]" aria-hidden="true">
      {/* Outer circle */}
      <circle cx="100" cy="100" r="85" fill="none" stroke="hsl(27,100%,50%)" strokeWidth="0.6" opacity="0.3" />
      {/* Equator ellipse */}
      <ellipse cx="100" cy="100" rx="85" ry="30" fill="none" stroke="hsl(27,100%,50%)" strokeWidth="0.5" opacity="0.25" />
      {/* Vertical meridian */}
      <ellipse cx="100" cy="100" rx="30" ry="85" fill="none" stroke="hsl(33,100%,53%)" strokeWidth="0.4" opacity="0.2" />
      {/* Axes */}
      <line x1="100" y1="15" x2="100" y2="185" stroke="hsl(27,100%,55%)" strokeWidth="0.5" opacity="0.3" />
      <line x1="15" y1="100" x2="185" y2="100" stroke="hsl(27,100%,55%)" strokeWidth="0.5" opacity="0.3" />
      {/* |0⟩ and |1⟩ labels */}
      <text x="100" y="10" textAnchor="middle" fill="hsl(27,100%,60%)" fontSize="10" opacity="0.7">|0⟩</text>
      <text x="100" y="198" textAnchor="middle" fill="hsl(27,100%,60%)" fontSize="10" opacity="0.7">|1⟩</text>
      {/* State vector */}
      <line x1="100" y1="100" x2="140" y2="45" stroke="hsl(27,100%,55%)" strokeWidth="1.2" opacity="0.6" />
      <circle cx="140" cy="45" r="3" fill="hsl(27,100%,55%)" opacity="0.8">
        <animate attributeName="r" values="3;4.5;3" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Glow around state */}
      <circle cx="140" cy="45" r="8" fill="none" stroke="hsl(27,100%,55%)" strokeWidth="0.5" opacity="0.3">
        <animate attributeName="r" values="8;12;8" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

/* ==== Entanglement Animation SVG ==== */
function EntanglementAnim() {
  return (
    <svg viewBox="0 0 200 100" className="h-full w-full max-h-[120px]" aria-hidden="true">
      {/* Particle A */}
      <circle cx="40" cy="50" r="6" fill="hsl(27,100%,55%)" opacity="0.7">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="40" cy="50" r="14" fill="none" stroke="hsl(27,100%,50%)" strokeWidth="0.5" opacity="0.3">
        <animate attributeName="r" values="14;20;14" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* Particle B */}
      <circle cx="160" cy="50" r="6" fill="hsl(33,100%,53%)" opacity="0.7">
        <animate attributeName="opacity" values="1;0.7;1" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="160" cy="50" r="14" fill="none" stroke="hsl(33,100%,53%)" strokeWidth="0.5" opacity="0.3">
        <animate attributeName="r" values="14;20;14" dur="2.5s" repeatCount="indefinite" begin="0.2s" />
      </circle>
      {/* Entanglement connection line */}
      <path d="M50 50 Q100 20 150 50" fill="none" stroke="hsl(27,100%,50%)" strokeWidth="0.8" opacity="0.25" strokeDasharray="4 3">
        <animate attributeName="stroke-dashoffset" values="0;-14" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M50 50 Q100 80 150 50" fill="none" stroke="hsl(33,100%,53%)" strokeWidth="0.8" opacity="0.25" strokeDasharray="4 3">
        <animate attributeName="stroke-dashoffset" values="0;14" dur="2s" repeatCount="indefinite" />
      </path>
      {/* Labels */}
      <text x="40" y="78" textAnchor="middle" fill="hsl(27,100%,60%)" fontSize="8" opacity="0.5">A</text>
      <text x="160" y="78" textAnchor="middle" fill="hsl(33,100%,60%)" fontSize="8" opacity="0.5">B</text>
    </svg>
  )
}

const modules = [
  {
    title: "Qubits",
    description:
      "The fundamental unit of quantum information. Unlike classical bits that exist as 0 or 1, qubits exploit superposition to exist in both states simultaneously. This exponential state space is the source of quantum computing's power.",
    details: [
      "Classical bits vs quantum bits",
      "Superposition and the Bloch sphere representation",
      "Physical implementations: superconducting, trapped ion, photonic",
      "Decoherence and the fragility of quantum states",
    ],
  },
  {
    title: "Quantum Gates",
    description:
      "Quantum gates are the building blocks of quantum circuits. They manipulate qubits through unitary transformations, enabling operations impossible in classical computing — such as creating entanglement and exploiting interference.",
    details: [
      "Single-qubit gates: Hadamard, Pauli-X/Y/Z, Phase",
      "Multi-qubit gates: CNOT, Toffoli, SWAP",
      "Universal gate sets and quantum circuit models",
      "Reversibility and unitarity constraints",
    ],
  },
  {
    title: "Algorithms",
    description:
      "Quantum algorithms exploit quantum mechanical properties to achieve computational speedups over classical approaches. From factoring large integers to searching unsorted databases, these algorithms define the frontier of computational theory.",
    details: [
      "Shor's algorithm: polynomial-time integer factorization",
      "Grover's search: quadratic speedup for unstructured search",
      "Variational Quantum Eigensolver (VQE)",
      "Quantum approximate optimization (QAOA)",
    ],
  },
  {
    title: "Cryptography",
    description:
      "Quantum cryptography leverages the laws of physics — not computational hardness — to guarantee security. Quantum key distribution makes eavesdropping physically detectable, while quantum computing threatens classical encryption schemes.",
    details: [
      "Quantum key distribution (BB84 protocol)",
      "No-cloning theorem as security foundation",
      "Post-quantum cryptography and lattice-based schemes",
      "Threat to RSA and elliptic curve cryptography",
    ],
  },
]

export default function QuantumComputingPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) {
      el.querySelectorAll(".reveal").forEach((c) => c.classList.add("visible"))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    )
    el.querySelectorAll(".reveal").forEach((c) => observer.observe(c))
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="relative z-10">
      {/* Hero Header */}
      <section className="flex flex-col items-center justify-center px-4 pb-16 pt-24 text-center md:pb-24 md:pt-32">
        <div className="reveal mx-auto max-w-3xl">
          <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            Quantum Computing
          </h1>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-saffron-500 to-transparent" />
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            From qubits to quantum algorithms — understanding the technology
            built on the foundations of quantum mechanical principles.
          </p>
        </div>
      </section>

      {/* Animated Graphics Row */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="reveal grid gap-6 md:grid-cols-2">
          <div className="glass-card animate-float-slow flex flex-col items-center rounded-2xl p-6">
            <BlochSphere />
            <p className="mt-3 text-center text-xs text-muted-foreground/60">
              Bloch Sphere — Qubit State Representation
            </p>
          </div>
          <div className="glass-card animate-float-slow flex flex-col items-center justify-center rounded-2xl p-6" style={{ animationDelay: "3s" }}>
            <EntanglementAnim />
            <p className="mt-3 text-center text-xs text-muted-foreground/60">
              Quantum Entanglement — Correlated States
            </p>
          </div>
        </div>
      </section>

      {/* Module Cards */}
      <section className="mx-auto max-w-4xl space-y-8 px-4 pb-24">
        {modules.map((mod, i) => (
          <div
            key={mod.title}
            className="reveal"
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className="glass-card rounded-2xl p-8 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center rounded-lg bg-saffron-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-saffron-400">
                  Module {i + 1}
                </span>
              </div>
              <h2 className="font-serif text-2xl font-semibold text-saffron-300 md:text-3xl">
                {mod.title}
              </h2>
              <div className="mt-2 h-px w-16 bg-gradient-to-r from-saffron-500 to-transparent" />
              <p className="mt-5 leading-relaxed text-muted-foreground">
                {mod.description}
              </p>
              <ul className="mt-5 space-y-2.5">
                {mod.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron-400/50" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
