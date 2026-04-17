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

  useEffect(() => {
    let mounted = true
    async function loadBlogs() {
      setLoadingBlogs(true)
      try {
        const result = await listBlogs({ page: 1, limit: 6 })
        if (!mounted) return
        if (result.success) {
          setBlogs(result.data.items)
          setBlogError(null)
        } else {
          setBlogError(result.error)
        }
      } catch (err) {
        if (!mounted) return
        setBlogError((err as Error).message || "Failed to load blogs")
      } finally {
        if (mounted) setLoadingBlogs(false)
      }
    }
    void loadBlogs()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadForums() {
      setLoadingForums(true)
      try {
        const result = await listForums({ page: 1, limit: 4 })
        if (!mounted) return
        if (result.success) {
          setForums(result.data.items)
          setForumError(null)
        } else {
          setForumError(result.error)
        }
      } catch (err) {
        if (!mounted) return
        setForumError((err as Error).message || "Failed to load forums")
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
            <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-saffron-500 to-transparent" />
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {loadingBlogs && (
              <div className="glass-card rounded-2xl p-7 text-sm text-muted-foreground">
                Loading...
              </div>
            )}
            {blogError && (
              <div className="glass-card rounded-2xl border border-red-500/30 bg-red-500/10 p-7 text-sm text-red-200">
                {blogError}
              </div>
            )}
            {!loadingBlogs && !blogError && blogs.length === 0 && (
              <div className="col-span-full glass-card rounded-2xl p-7 text-sm text-muted-foreground text-center">
                No discourses yet. <Link href="/blogs" className="text-saffron-400">Start one</Link>
              </div>
            )}
            {!loadingBlogs &&
              !blogError &&
              blogs.map((post, i) => (
                <div
                  key={post.id}
                  className="reveal"
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  <article className="glass-card animate-float-slow group flex h-full flex-col rounded-2xl p-7" style={{ animationDelay: `${i * 1.2}s` }}>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-saffron-500/10 text-xs font-semibold text-saffron-400">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <span className="text-xs text-muted-foreground/60">BLOG</span>
                    </div>

                    <h3 className="font-serif text-xl font-semibold leading-snug text-foreground transition-colors duration-300 group-hover:text-saffron-300">
                      {post.title}
                    </h3>

                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {renderExcerpt(post.content)}
                    </p>

                    <div className="mt-4 text-xs text-muted-foreground/60">
                      {post.author?.name ?? "Unknown"}
                    </div>

                    <div className="mt-5">
                      <Link
                        href={`/blogs/${post.slug}`}
                        className="saffron-underline inline-flex items-center gap-2 text-sm font-medium text-saffron-400 transition-colors duration-300 hover:text-saffron-300"
                      >
                        Read Analysis
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform duration-300 group-hover:translate-x-1">
                          <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    </div>
                  </article>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* ===== INTELLECTUAL DISCOVERIES - FORUMS ===== */}
      <section className="relative z-10 px-4 py-24 md:py-32" style={{ background: "hsl(0, 0%, 3%)" }}>
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
              <div className="col-span-full glass-card rounded-xl p-6 text-sm text-muted-foreground text-center">
                Loading discussions...
              </div>
            )}
            {forumError && (
              <div className="col-span-full glass-card rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
                {forumError}
              </div>
            )}
            {!loadingForums && !forumError && forums.length === 0 && (
              <div className="col-span-full glass-card rounded-xl p-6 text-sm text-muted-foreground text-center">
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

  <h3
    className="font-serif text-lg font-semibold text-white group-hover:text-blue-300 transition-colors"
    style={{ color: '#fff' }}
  >
    {forum.title}
  </h3>

  <p
    className="mt-2 text-sm text-gray-300 line-clamp-2"
    style={{ color: '#ccc' }}
  >
    {forum.content.slice(0, 150)}...
  </p>

  {/* rest of the content */}
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
