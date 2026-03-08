"use client"

import { useEffect, useRef } from "react"
import { PhaseSection } from "@/components/phase-section"
import { quantumPhysicsPhases } from "@/lib/quantum-physics-data"

export default function QuantumPhysicsPage() {
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
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    )
    el.querySelectorAll(".reveal").forEach((c) => observer.observe(c))
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="relative z-10">
      {/* Hero Header */}
      <section className="flex flex-col items-center justify-center px-4 pb-12 pt-24 text-center md:pb-20 md:pt-32">
        <div className="reveal mx-auto max-w-3xl">
          <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            Quantum Physics
          </h1>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-saffron-500 to-transparent" />
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            A guided intellectual journey through the foundations, formalism,
            interpretation, and frontiers of quantum mechanics. Eight phases.
            Twenty chapters. One ascent toward understanding.
          </p>
        </div>
      </section>

      {/* Phase Guide */}
      <section className="mx-auto max-w-4xl px-4 pb-8">
        <div className="reveal glass-subtle rounded-xl px-6 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Each phase is a milestone. Expand chapters to see topics covered.
            Scrolling should feel like ascending through levels of understanding.
          </p>
        </div>
      </section>

      {/* Phases */}
      <section className="mx-auto max-w-4xl space-y-8 px-4 pb-24">
        {quantumPhysicsPhases.map((phase, i) => (
          <div
            key={phase.number}
            className="reveal"
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <PhaseSection phase={phase} />
          </div>
        ))}

        {/* End of Curriculum */}
        <div className="reveal" style={{ transitionDelay: "700ms" }}>
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="font-serif text-lg font-semibold text-foreground">
              End of Current Curriculum
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Lesson content for each chapter will be published progressively.
              The journey through quantum mechanics is infinite — return to continue your ascent.
            </p>
            <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-saffron-500/30 to-transparent" />
          </div>
        </div>
      </section>
    </div>
  )
}
