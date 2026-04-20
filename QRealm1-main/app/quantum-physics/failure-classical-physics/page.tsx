"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"

export default function FailureClassicalPhysicsPage() {
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
      <section className="flex flex-col items-center justify-center px-4 pb-8 pt-24 text-center md:pb-12 md:pt-32">
        <div className="reveal mx-auto max-w-3xl">
          <Link 
            href="/quantum-physics" 
            className="text-sm text-saffron-400 hover:text-saffron-300 mb-4 inline-block"
          >
            ← Back to Quantum Physics
          </Link>
          <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            Failure In Classical Physics
          </h1>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-saffron-500 to-transparent" />
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Exploring the ultraviolet catastrophe and the limitations of classical physics that led to quantum theory.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-12 px-4 pb-24">
        <div className="reveal glass-card rounded-xl p-8">
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
            Blackbody Radiation
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Blackbody radiation was studied experimentally first, and classical theories were proposed to explain the observed data.
            A black body is an idealized object that absorbs all incident radiation and emits radiation regardless of frequency or angle of incidence, with a spectrum determined solely by its temperature with finite total energy output. It emits radiation in a continuous spectrum that depends only on its temperature.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Where does the black body get energy to emit radiation?</strong> The black body absorbs external radiation, converting that energy into internal thermal energy, which is then emitted as thermal radiation according to its temperature.
          </p>
        </div>

        <div className="reveal glass-card rounded-xl p-8">
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
            The Ultraviolet Catastrophe
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Classical physics predicted that a black body would emit radiation with a continuous spectrum and that the energy density would diverge at high frequencies, leading to infinite energy output in the ultraviolet region. However, experiments showed that the emitted energy remains finite and decreases at short wavelengths.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            This failure of classical theory is known as the <strong className="text-saffron-400">ultraviolet catastrophe</strong> and led to the introduction of energy quantization by Planck.
          </p>
        </div>

        <div className="reveal glass-card rounded-xl p-8">
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
            The Equipartition Theorem
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            The equipartition theorem (classical physics) states: At thermal equilibrium, each quadratic degree of freedom contributes an average energy of <strong className="text-foreground">(1/2) k<sub>B</sub>T</strong>
          </p>
          <div className="bg-[hsl(0,0%,100%,0.03)] rounded-lg p-4 mb-6">
            <ul className="space-y-3 text-muted-foreground">
              <li>• <strong className="text-foreground">Translational motion in one direction:</strong> (1/2)k<sub>B</sub>T</li>
              <li>• <strong className="text-foreground">Harmonic oscillator - Kinetic term:</strong> (1/2)k<sub>B</sub>T</li>
              <li>• <strong className="text-foreground">Harmonic oscillator - Potential term:</strong> (1/2)k<sub>B</sub>T</li>
              <li>• <strong className="text-foreground">Total for harmonic oscillator:</strong> ⟨E⟩ = k<sub>B</sub>T</li>
            </ul>
          </div>
          <h3 className="font-semibold text-foreground mb-3">Applying Equipartition to Black-Body Radiation</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            In classical physics, radiation inside a black body cavity is treated as standing electromagnetic waves. Each standing wave mode behaves like a harmonic oscillator. Therefore, classical theory assigns energy k<sub>B</sub>T to every mode, regardless of frequency.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            This leads to the Rayleigh–Jean's result: <strong className="text-foreground">u(ν,T) ∝ ν² k<sub>B</sub>T</strong>
          </p>
        </div>

        <div className="reveal glass-card rounded-xl p-8">
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
            Rayleigh–Jeans Law
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            The Rayleigh–Jeans law describes black-body radiation by predicting that the energy density is proportional to temperature and to the square of the frequency, or equivalently inversely proportional to the fourth power of wavelength. While it agrees with experimental results at low frequencies (long wavelengths), it predicts a divergence of energy at high frequencies (short wavelengths), leading to the ultraviolet catastrophe.
          </p>
          <div className="bg-[hsl(0,0%,100%,0.03)] rounded-lg p-4 mb-6">
            <p className="text-foreground font-medium mb-3">Energy density per unit:</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">By frequency:</strong> u(ν,T) = 8πν²kT / c³</li>
              <li><strong className="text-foreground">By wavelength:</strong> u(λ,T) = 8πkT / λ⁴</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Where: u = energy density, ν = frequency, λ = wavelength, T = absolute temperature, k = Boltzmann constant, c = speed of light
          </p>
        </div>

        <div className="reveal glass-card rounded-xl p-8">
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
            Why the Theorem Fails at High Frequencies
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-foreground">Key problem:</strong> Energy assumed to be continuous in classical equipartition.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Classical equipartition assumes energy can vary continuously with no restriction on how small or large energy changes can be. But experimentally, high-frequency radiation carries discrete energy packets: <strong className="text-foreground">E = hν</strong>
          </p>
          <div className="bg-[hsl(0,0%,100%,0.03)] rounded-lg p-4">
            <p className="text-muted-foreground leading-relaxed">
              At high frequencies: <strong className="text-saffron-400">hν ≫ k<sub>B</sub>T</strong>
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              This means thermal energy k<sub>B</sub>T is not enough to excite these modes. High-frequency oscillators are rarely populated. They do not receive k<sub>B</sub>T of energy as equipartition predicts. Classical physics had no mechanism to suppress these modes.
            </p>
          </div>
        </div>

        <div className="reveal glass-card rounded-xl p-8">
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
            Stefan-Boltzmann Law
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            The Stefan–Boltzmann law states that the total radiant energy emitted per unit time by a blackbody is proportional to the fourth power of its absolute temperature.
          </p>
          <div className="bg-[hsl(0,0%,100%,0.03)] rounded-lg p-4 mb-6">
            <p className="text-foreground text-center text-xl font-medium">P = σAT⁴</p>
            <p className="text-foreground text-center text-xl font-medium mt-2">or</p>
            <p className="text-foreground text-center text-xl font-medium mt-2">j* = σT⁴</p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Where: P = total power radiated, A = surface area, T = absolute temperature in kelvin, σ = 5.67×10⁻⁸ W m⁻²K⁻⁴ (Stefan–Boltzmann constant)
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The law implies that a small increase in temperature results in a large increase in emitted energy. For example, doubling the temperature increases the emitted power by a factor of sixteen.
          </p>
        </div>

        <div className="reveal glass-card rounded-xl p-8">
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
            Essence of Mathematics in Quantum Physics
          </h2>
          
          <h3 className="font-semibold text-foreground mb-3">Linear Algebra</h3>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Linear algebra is a branch of mathematics that deals with solving problems requiring manipulation of vectors in higher dimensional structures. In quantum physics, quantum states are represented using vectors in a vector space. The notation |ψ⟩ (ket vector) denotes the physical state of a quantum system. Quantum states can be expressed as linear combinations:
          </p>
          <div className="bg-[hsl(0,0%,100%,0.03)] rounded-lg p-4 mb-6">
            <p className="text-foreground font-mono">|ψ⟩ = a₁|ψ₁⟩ + a₂|ψ₂⟩ + a₃|ψ₃⟩ + ...</p>
          </div>

          <h3 className="font-semibold text-foreground mb-3">Matrices</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Matrices are rectangular arrays of numbers arranged in rows and columns. In quantum physics, matrices are used to represent operators and the evolution of quantum states. Matrix mechanics, developed by Heisenberg, provides one formulation of quantum mechanics.
          </p>

          <h3 className="font-semibold text-foreground mb-3">Calculus & Probability Density</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            In classical physics, exact predictions are possible with position and velocity. In quantum mechanics, that certainty is replaced by probabilities. The probability density describes the likelihood of a continuous random variable falling within a specific range.
          </p>
          <div className="bg-[hsl(0,0%,100%,0.03)] rounded-lg p-4 mb-4">
            <p className="text-foreground font-medium">Probability density:</p>
            <p className="text-foreground font-mono mt-2">ρ(x,t) = |ψ(x,t)|²</p>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            This means if |ψ(x)|² is large at some position x, you are more likely to find the particle there when you measure it. Integration is used to find the probability of finding the particle between limits a and b:
          </p>
          <div className="bg-[hsl(0,0%,100%,0.03)] rounded-lg p-4 mt-4">
            <p className="text-foreground font-mono">P(a ≤ x ≤ b) = ∫ₐᵇ |ψ(x)|² dx</p>
          </div>
        </div>

        <div className="reveal glass-card rounded-xl p-8">
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
            Conclusion
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Mathematics forms the backbone of quantum physics and serves as the essential language through which quantum phenomena are understood and expressed. What may initially seem abstract or intimidating becomes intuitive when mathematical concepts are tied to physical meaning. Linear algebra provides the framework to describe quantum states through vectors, superposition, and vector spaces. Matrices extend this framework by enabling the representation of operators, transformations, and the evolution of quantum states. Calculus describes continuous change and accumulation, crucial for understanding wavefunctions and probability densities. Together, these mathematical tools transform abstract concepts into a powerful lens through which the fundamental nature of reality can be explored and understood.
          </p>
        </div>

        <div className="reveal text-center">
          <Link href="/quantum-physics" className="saffron-btn inline-block">
            Continue to Next Chapter
          </Link>
        </div>
      </section>
    </div>
  )
}
