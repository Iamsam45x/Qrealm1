import Link from "next/link"
import { headers } from "next/headers"
import { listBlogs } from "@/lib/api"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function excerpt(content: string, max = 220) {
  const clean = content.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max)}...`
}

export default async function BlogsPage() {
  const cookie = (await headers()).get("cookie") ?? ""
  const result = await listBlogs({ page: 1, limit: 12 }, { cookie })

  const blogs = result.success ? result.data.items : []
  const error = result.success ? null : result.error

  return (
    <div className="relative z-10">
      <section className="flex flex-col items-center justify-center px-4 pb-16 pt-24 text-center md:pb-24 md:pt-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            Intellectual Discourses
          </h1>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-saffron-500 to-transparent" />
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Rigorous analyses bridging ancient wisdom and frontier science.
            Each discourse examines a fundamental conflict from multiple
            interpretive lenses, grounded in peer-reviewed research.
          </p>
          <div className="mt-8">
            <Link href="/blogs/new" className="saffron-btn text-sm">
              Submit a Blog
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div className="mx-auto max-w-4xl px-4 pb-8">
          <div className="rounded-lg bg-red-500/10 p-4 text-center text-red-400">
            Unable to load blogs. Please try again later.
          </div>
        </div>
      )}

      <section className="mx-auto max-w-4xl space-y-8 px-4 pb-24">
        {blogs.length === 0 && !error && (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
            No blogs published yet.
          </div>
        )}
        {blogs.map((post) => (
          <article key={post.id} className="glass-card group rounded-2xl p-7 md:p-9">
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground/70">
              <span>{post.author?.name ?? "Unknown author"}</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>

            <h2 className="font-serif text-xl font-semibold leading-snug text-foreground transition-colors duration-300 group-hover:text-saffron-300 md:text-2xl">
              {post.title}
            </h2>

            <p className="mt-4 leading-relaxed text-muted-foreground">
              {excerpt(post.content)}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground/70">
              <span>{post._count?.comments ?? 0} comments</span>
              <span>{post._count?.likes ?? 0} likes</span>
            </div>

            <div className="mt-5">
              <Link
                href={`/blogs/${post.slug}`}
                className="saffron-underline inline-flex items-center gap-2 text-sm font-medium text-saffron-400 transition-colors duration-300 hover:text-saffron-300"
              >
                Read Full Analysis
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  <path
                    d="M1 7h12M8 2l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
