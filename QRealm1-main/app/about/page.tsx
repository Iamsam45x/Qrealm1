"use client"

import { useEffect, useRef } from "react"

export default function AboutPage() {
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
      {/* Hero-style Intro */}
      <section className="flex flex-col items-center justify-center px-4 pb-16 pt-24 text-center md:pb-24 md:pt-32">
        <div className="reveal mx-auto max-w-3xl">
          <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            About This Platform
          </h1>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-saffron-500 to-transparent" />
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            The Battle of Interpretations is a scholarly arena where ancient Vedantic
            wisdom meets modern scientific inquiry. Every argument is grounded in
            evidence, every discourse is structured by reason.
          </p>
        </div>
      </section>

      {/* Three Floating Sections */}
      <section className="mx-auto max-w-5xl space-y-8 px-4 pb-24">
        {/* 1. Philosophy of Interpretation */}
        <div className="reveal" style={{ transitionDelay: "100ms" }}>
          <div className="glass-card animate-float-slow rounded-2xl p-8 md:p-10">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-saffron-500/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(27,100%,55%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-saffron-300 md:text-3xl">
              Philosophy of Interpretation
            </h2>
            <div className="mt-2 h-px w-16 bg-gradient-to-r from-saffron-500 to-transparent" />
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Every civilization has been shaped not by raw facts, but by the <em>interpretation</em> of
              those facts. The Copernican revolution was not merely a change in astronomical data—it was
              a philosophical upheaval. Darwin&apos;s theory did not simply describe biology; it redefined
              humanity&apos;s self-conception entirely.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              This platform exists because interpretations carry immense power. The way we interpret
              quantum mechanics determines whether we believe in free will, parallel universes, or
              observer-dependent reality. The way we interpret consciousness determines whether
              artificial intelligence can ever be truly sentient.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              We do not offer singular answers. We offer structured battlefields where competing
              interpretations are examined with intellectual rigour and philosophical depth.
            </p>
          </div>
        </div>

        {/* 2. Science vs Metaphysics */}
        <div className="reveal" style={{ transitionDelay: "200ms" }}>
          <div className="glass-card animate-float-slow rounded-2xl p-8 md:p-10" style={{ animationDelay: "2s" }}>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-saffron-500/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(27,100%,55%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M3 12h18M5.63 5.63l12.74 12.74M18.37 5.63 5.63 18.37" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-saffron-300 md:text-3xl">
              Science vs Metaphysics
            </h2>
            <div className="mt-2 h-px w-16 bg-gradient-to-r from-saffron-500 to-transparent" />
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Modern science prides itself on empirical methodlogy, yet every scientific paradigm rests
              on unspoken metaphysical assumptions. When Bohr declared that quantum mechanics says
              nothing about objective reality, he was making a profoundly metaphysical claim.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The ancient Vedantic tradition recognized this interplay millennia ago. The concept of
              Māyā—the veil of perceived reality—parallels the quantum measurement problem in striking
              ways. The Upanishadic inquiry into the nature of Brahman mirrors the physicist&apos;s search
              for a unified field theory.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              This platform stands at the intersection of empirical science, philosophical inquiry,
              and metaphysical wisdom. We reject the false dichotomy between them. The deepest truths
              emerge only when all three perspectives are brought to bear.
            </p>
          </div>
        </div>

        {/* 3. Knowledge as Purification */}
        <div className="reveal" style={{ transitionDelay: "300ms" }}>
          <div className="glass-card animate-float-slow rounded-2xl p-8 md:p-10" style={{ animationDelay: "4s" }}>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-saffron-500/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(27,100%,55%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-saffron-300 md:text-3xl">
              Knowledge as Purification
            </h2>
            <div className="mt-2 h-px w-16 bg-gradient-to-r from-saffron-500 to-transparent" />
            <p className="mt-5 font-devanagari text-lg text-saffron-300/80" style={{ fontFamily: "var(--font-devanagari)" }}>
              &ldquo;न हि ज्ञानेन सदृशं पवित्रमिह विद्यते।&rdquo;
            </p>
            <p className="mt-2 text-sm italic text-muted-foreground">
              &ldquo;There is nothing as purifying as knowledge.&rdquo; — Bhagavad Gita 4.38
            </p>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              The pursuit of knowledge is not merely an intellectual exercise—it is a form of
              purification. Every false assumption discarded, every bias examined, every dogma
              questioned brings the seeker closer to clarity.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              This platform demands intellectual honesty above all. No rhetoric. No emotional
              exaggeration. No appeals to authority without evidence. The battlefield here rewards
              only those who come armed with reason, grounded in research, and willing to have their
              interpretations challenged.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Whether you are a physicist, philosopher, student, or seeker — you enter here not as a
              believer, but as an interpreter. Your weapon is analysis. Your shield is evidence.
              Your goal is understanding.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
