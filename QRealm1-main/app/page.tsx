"use client"

import React, { useEffect, useRef, useCallback, useState } from "react"
import Link from "next/link"
import { ParticleField } from "@/components/particle-field"
import { NeuralNetwork } from "@/components/neural-network"
import { listBlogs, listForums, type Blog, type Forum } from "@/lib/api"

/* ===== SCROLL REVEAL HOOK ===== */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
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

  return ref
}

/* ===== MAIN PAGE ===== */
export default function HomePage() {
  const containerRef = useReveal()
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [forums, setForums] = useState<Forum[]>([])
  const [blogError, setBlogError] = useState<string | null>(null)
  const [forumError, setForumError] = useState<string | null>(null)
  const [loadingBlogs, setLoadingBlogs] = useState(true)
  const [loadingForums, setLoadingForums] = useState(true)

  const mockBlogs: Blog[] = [
    {
      id: "demo-1",
      title: "The Wave Function: Reality or Information?",
      slug: "wave-function-reality-or-information",
      content: "The wave function is the central mathematical object in quantum mechanics, yet there is fierce debate about what it actually represents. Does it describe a physical reality, or merely our knowledge of a system? This analysis explores the Copenhagen interpretation, the pilot-wave theory, and the many-worlds interpretation.",
      published: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: "demo",
      author: { id: "demo", name: "Prof. Sharma" },
      _count: { comments: 15, likes: 32 }
    },
    {
      id: "demo-2",
      title: "Non-Duality in Advaita Vedanta and Quantum Theory",
      slug: "non-duality-advaita-quantum",
      content: "Both Advaita Vedanta and certain interpretations of quantum mechanics point toward a fundamental non-dual nature of reality. This discourse examines the striking parallels and crucial differences between the philosophical framework of Shankara and the Copenhagen interpretation.",
      published: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: "demo",
      author: { id: "demo", name: "Dr. Rao" },
      _count: { comments: 28, likes: 45 }
    },
    {
      id: "demo-3",
      title: "Quantum Entanglement: Spooky Action at a Distance",
      slug: "quantum-entanglement-spooky-action",
      content: "Einstein famously called quantum entanglement 'spooky action at a distance.' This analysis explores how entangled particles remain connected regardless of distance, and what this means for our understanding of locality and realism.",
      published: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: "demo",
      author: { id: "demo", name: "Quantum Explorer" },
      _count: { comments: 21, likes: 38 }
    },
    {
      id: "demo-4",
      title: "The Observer Effect in Quantum Mechanics",
      slug: "observer-effect-quantum-mechanics",
      content: "Does observation fundamentally alter quantum systems, or is it simply a limit of our measurement capabilities? This discourse examines the role of measurement in quantum theory and the philosophical implications for consciousness and reality.",
      published: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: "demo",
      author: { id: "demo", name: "Physics Researcher" },
      _count: { comments: 19, likes: 27 }
    },
    {
      id: "demo-5",
      title: "Quantum Computing: The Next Frontier",
      slug: "quantum-computing-next-frontier",
      content: "Quantum computers promise to revolutionize computing by leveraging superposition and entanglement. This analysis explores the current state of quantum computing and the challenges that remain before quantum advantage becomes practical.",
      published: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: "demo",
      author: { id: "demo", name: "Tech Analyst" },
      _count: { comments: 12, likes: 22 }
    },
    {
      id: "demo-6",
      title: "The Philosophy of Time in Modern Physics",
      slug: "philosophy-time-modern-physics",
      content: "Time appears to flow in one direction, yet the fundamental equations of physics are time-symmetric. This discourse explores the thermodynamic, cosmological, and philosophical perspectives on the nature of time.",
      published: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: "demo",
      author: { id: "demo", name: "Philosopher of Science" },
      _count: { comments: 8, likes: 15 }
    }
  ]

  useEffect(() => {
    let mounted = true
    async function loadBlogs() {
      setLoadingBlogs(true)
      try {
        const result = await listBlogs({ page: 1, limit: 6 })
        if (!mounted) return
        if (result.success && result.data.items.length > 0) {
          setBlogs(result.data.items)
          setBlogError(null)
        } else {
          setBlogs(mockBlogs)
          setBlogError(null)
        }
      } catch (err) {
        if (!mounted) return
        setBlogs(mockBlogs)
        setBlogError(null)
      } finally {
        if (mounted) setLoadingBlogs(false)
      }
    }
    void loadBlogs()
    return () => {
      mounted = false
    }
  }, [])

  const mockForums: Forum[] = [
    {
      id: "demo-1",
      title: "The Measurement Problem in Quantum Mechanics",
      content: "Does the wave function collapse objectively, or is it just a update of our knowledge? Explore the different interpretations including Copenhagen, Many-Worlds, and QBism.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: "demo",
      author: { id: "demo", name: "Quantum Explorer" },
      _count: { comments: 24, likes: 15 }
    },
    {
      id: "demo-2",
      title: "Consciousness and Quantum Biology",
      content: "Could quantum effects in microtubules explain the hard problem of consciousness? Discuss the Orch-OR theory and its critics.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: "demo",
      author: { id: "demo", name: "Philosophy of Mind" },
      _count: { comments: 18, likes: 9 }
    },
    {
      id: "demo-3",
      title: "Vedanta and Modern Physics",
      content: "How do the non-dual teachings of Advaita Vedanta compare to the interpretations of quantum mechanics? A cross-cultural inquiry.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: "demo",
      author: { id: "demo", name: "Eastern Thought" },
      _count: { comments: 31, likes: 22 }
    },
    {
      id: "demo-4",
      title: "The Arrow of Time and Entropy",
      content: "Why does time flow in one direction? Discuss the thermodynamic arrow, the cosmological arrow, and their connection to the Big Bang.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: "demo",
      author: { id: "demo", name: "Physics Enthusiast" },
      _count: { comments: 12, likes: 7 }
    }
  ]

  useEffect(() => {
    let mounted = true
    async function loadForums() {
      setLoadingForums(true)
      try {
        const result = await listForums({ page: 1, limit: 4 })
        if (!mounted) return
        if (result.success && result.data.items.length > 0) {
          setForums(result.data.items)
          setForumError(null)
        } else {
          setForums(mockForums)
          setForumError(null)
        }
      } catch (err) {
        if (!mounted) return
        setForums(mockForums)
        setForumError(null)
      } finally {
        if (mounted) setLoadingForums(false)
      }
    }
    void loadForums()
    return () => {
      mounted = false
    }
  }, [])

  const renderExcerpt = useCallback((content: string) => {
    const clean = content.replace(/\\s+/g, " ").trim()
    if (clean.length <= 160) return clean
    return `${clean.slice(0, 160)}...`
  }, [])

  return (
    <div ref={containerRef} className="relative flex flex-col">
      {/* Particle Background */}
      <ParticleField />

      {/* ===== HERO SECTION ===== */}
      <section className="relative flex min-h-[100vh] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-28">
        {/* Aurora glow orbs */}
        <div
          className="animate-aurora pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[600px] rounded-full opacity-30"
          style={{
            background: "radial-gradient(ellipse at center, hsla(27,100%,50%,0.2) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
          aria-hidden="true"
        />
        <div
          className="animate-aurora-2 pointer-events-none absolute left-[40%] top-[45%] h-[400px] w-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(ellipse at center, hsla(33,100%,53%,0.15) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
          aria-hidden="true"
        />

        {/* Geometric accent */}
        <div
          className="animate-gentle-rotate pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]"
          aria-hidden="true"
        >
          <svg width="600" height="600" viewBox="0 0 600 600" fill="none">
            <circle cx="300" cy="300" r="280" stroke="hsl(27,100%,50%)" strokeWidth="0.5" />
            <circle cx="300" cy="300" r="220" stroke="hsl(27,100%,50%)" strokeWidth="0.3" />
            <circle cx="300" cy="300" r="160" stroke="hsl(33,100%,53%)" strokeWidth="0.3" />
            <polygon points="300,40 560,440 40,440" stroke="hsl(27,100%,50%)" strokeWidth="0.3" fill="none" />
            <polygon points="300,560 40,160 560,160" stroke="hsl(33,100%,53%)" strokeWidth="0.3" fill="none" />
          </svg>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Main Title */}
          <div className="reveal" style={{ transitionDelay: "0ms" }}>
            <h1 className="font-serif text-5xl font-bold leading-tight tracking-tight md:text-7xl lg:text-8xl">
              <span className="animate-shimmer">
                QRealm
              </span>
            </h1>
            <p className="mt-3 font-serif text-xl font-light tracking-widest text-muted-foreground md:text-2xl">
              Tattva Vimarsha
            </p>
          </div>

          {/* Sanskrit Sloka */}
          <div className="reveal mt-10" style={{ transitionDelay: "200ms" }}>
            <div className="tooltip-trigger inline-block">
              <p className="font-devanagari text-xl leading-loose text-saffron-300 md:text-2xl" style={{ fontFamily: "var(--font-devanagari)" }}>
                &ldquo;न हि ज्ञानेन सदृशं पवित्रमिह विद्यते।&rdquo;
              </p>
              <p className="mt-2 text-sm italic tracking-wide text-muted-foreground">
                Nā hi jñānena sadṛśaṁ pavitram iha vidyate.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                — Bhagavad Gita 4.38
              </p>
              {/* Tooltip on hover */}
              <div className="tooltip-fade mt-3 rounded-lg bg-[hsl(0,0%,100%,0.05)] px-4 py-2 text-sm text-saffron-200">
                &ldquo;There is nothing as purifying as knowledge.&rdquo;
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="reveal mt-14" style={{ transitionDelay: "400ms" }}>
            <Link href="/blogs" className="saffron-btn animate-saffron-pulse inline-block text-base">
              Enter the Debate
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="reveal absolute bottom-8 left-1/2 -translate-x-1/2" style={{ transitionDelay: "800ms" }}>
          <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
            <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
            <div className="h-8 w-px animate-float bg-gradient-to-b from-saffron-500/40 to-transparent" />
          </div>
        </div>
      </section>

      {/* ===== ABOUT SECTION ===== */}
      <section className="relative z-10 px-4 py-24 md:py-32" id="about">
        <div className="mx-auto max-w-6xl">
          <div className="reveal mb-16 text-center" style={{ transitionDelay: "0ms" }}>
            <h2 className="font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">
              Why QRealm?
            </h2>
            <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-saffron-500 to-transparent" />
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: Text */}
            <div className="space-y-6">
              <div className="reveal glass-card rounded-xl p-8" style={{ transitionDelay: "100ms" }}>
                <h3 className="font-serif text-xl font-semibold text-saffron-300">
                  Interpretations Shape Civilizations
                </h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  Every great advancement in human thought has emerged from the collision of competing interpretations. From ancient Vedantic discourse to modern quantum mechanics, the pursuit of truth has never been a straight line—it has been a battle.
                </p>
              </div>

              <div className="reveal glass-card rounded-xl p-8" style={{ transitionDelay: "200ms" }}>
                <h3 className="font-serif text-xl font-semibold text-saffron-300">
                  Science · Philosophy · Metaphysics
                </h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  This platform stands at the intersection of empirical science, philosophical inquiry, and metaphysical wisdom. We apply structured reasoning and evidence-based debate to the most fundamental questions of existence.
                </p>
              </div>

              <div className="reveal glass-card rounded-xl p-8" style={{ transitionDelay: "300ms" }}>
                <h3 className="font-serif text-xl font-semibold text-saffron-300">
                  Evidence-Based Discourse
                </h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  No dogma. No rhetoric. Every argument is grounded in verifiable research, peer-reviewed scholarship, and rigorous logical analysis. The battlefield here demands intellectual honesty above all.
                </p>
              </div>
            </div>

            {/* Right: Neural Network Animation */}
            <div className="reveal flex items-center justify-center" style={{ transitionDelay: "200ms" }}>
              <div className="glass-card flex items-center justify-center rounded-2xl p-6">
                <NeuralNetwork className="h-auto w-full max-w-[500px]" />
              </div>
            </div>
          </div>
        </div>
      </section>


{/* ===== INTELLECTUAL DISCOURSES - BLOGS ===== */}
      <section className="relative z-10 px-4 py-24 md:py-32" id="discourses">
        <div className="mx-auto max-w-6xl">
          <div className="reveal mb-16 text-center" style={{ transitionDelay: "0ms" }}>
            <h2 className="font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">
              Intellectual Discourses
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Rigorous analyses bridging ancient wisdom and frontier science.
            </p>
            <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {loadingBlogs && (
              <div className="col-span-full glass-card-forum rounded-xl p-6 text-sm text-gray-400 text-center">
                Loading...
              </div>
            )}
            {blogError && (
              <div className="col-span-full glass-card-forum rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
                {blogError}
              </div>
            )}
            {!loadingBlogs && !blogError && blogs.length === 0 && (
              <div className="col-span-full glass-card-forum rounded-xl p-6 text-sm text-gray-400 text-center">
                No discourses yet. <Link href="/blogs" className="text-blue-400">Start one</Link>
              </div>
            )}
            {!loadingBlogs &&
              !blogError &&
              blogs.map((post, i) => (
                <Link
                  key={post.id}
                  href={`/blogs/${post.slug}`}
                  className="glass-card-forum group flex flex-col rounded-xl p-5 transition-all hover:border-blue-500/40"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                    <span className="text-blue-400">BLOG</span>
                    <span>·</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-300 line-clamp-2">
                    {renderExcerpt(post.content)}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{post.author?.name ?? "Unknown"}</span>
                    <span>{post._count?.comments ?? 0} comments</span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>


      {/* ===== INTELLECTUAL DISCOVERIES - FORUMS ===== */}
      <section className="relative z-10 px-4 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="reveal mb-16 text-center" style={{ transitionDelay: "0ms" }}>
            <h2 className="font-serif text-3xl font-semibold md:text-4xl lg:text-5xl">
              Intellectual Discoveries
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Open discussions and collaborative inquiry into fundamental questions.
            </p>
            <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {loadingForums && (
              <div className="col-span-full glass-card-forum rounded-xl p-6 text-sm text-gray-400 text-center">
                Loading discussions...
              </div>
            )}
            {forumError && (
              <div className="col-span-full glass-card-forum rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
                {forumError}
              </div>
            )}
            {!loadingForums && !forumError && forums.length === 0 && (
              <div className="col-span-full glass-card-forum rounded-xl p-6 text-sm text-gray-400 text-center">
                No discussions yet. <Link href="/forums" className="text-blue-400">Start one</Link>
              </div>
            )}
{!loadingForums && !forumError && forums.map((forum, i) => (
              <Link
                key={forum.id}
                href={`/forums/${forum.id}`}
                className="glass-card-forum group flex flex-col rounded-xl p-5 transition-all hover:border-blue-500/40"
                style={{ display: 'block', visibility: 'visible', opacity: 1 }}
              >
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <span className="text-blue-400">FORUM</span>
                  <span>·</span>
                  <span>{new Date(forum.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-white group-hover:text-blue-300 transition-colors" style={{ color: '#fff' }}>
                  {forum.title}
                </h3>
                <p className="mt-2 text-sm text-gray-300 line-clamp-2" style={{ color: '#ccc' }}>
                  {forum.content.slice(0, 150)}...
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{forum.author?.name ?? "Unknown"}</span>
                  <span>{forum._count?.comments ?? 0} comments</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/forums" className="saffron-underline text-sm font-medium">
              View All Discussions →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
