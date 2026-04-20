import Link from "next/link"
import { headers } from "next/headers"
import { listForums } from "@/lib/api"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function excerpt(content: string, max = 200) {
  const clean = content.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max)}...`
}

export default async function ForumsPage() {
  const cookie = (await headers()).get("cookie") ?? ""
  const result = await listForums({ page: 1, limit: 12 }, { cookie })

  const forums = result.success ? result.data.items : []
  const error = result.success ? null : result.error

  return (
    <div className="relative z-10">
      <section className="flex flex-col items-center justify-center px-4 pb-16 pt-24 text-center md:pb-24 md:pt-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            Discussion Arena
          </h1>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-saffron-500 to-transparent" />
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            A moderated space for structured debate. Pose questions, examine assumptions,
            and engage in rigorous exchanges grounded in evidence.
          </p>
          <div className="mt-8">
            <Link href="/forums/new" className="saffron-btn text-sm">
              Start a Thread
            </Link>
          </div>
        </div>
</section>

      {error && (
        <div className="mx-auto max-w-4xl px-4 pb-8">
          <div className="rounded-lg bg-red-500/10 p-4 text-center text-red-400">
            Unable to load forums. Please try again later.
          </div>
        </div>
      )}

      <section className="mx-auto max-w-4xl space-y-6 px-4 pb-24">
        {forums.length === 0 && !error && (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
            No forum threads yet.
          </div>
        )}
        {forums.map((forum) => (
          <article key={forum.id} className="glass-card rounded-2xl p-7 md:p-9">
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground/70">
              <span>{forum.author?.name ?? "Unknown author"}</span>
              <span>{formatDate(forum.createdAt)}</span>
            </div>
            <h2 className="font-serif text-xl font-semibold text-saffron-300 md:text-2xl">
              {forum.title}
            </h2>
            <div className="mt-3 h-px w-16 bg-gradient-to-r from-saffron-500 to-transparent" />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {excerpt(forum.content)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground/70">
              <span>{forum._count?.comments ?? 0} comments</span>
              <span>{forum._count?.likes ?? 0} likes</span>
            </div>
            <div className="mt-5">
              <Link
                href={`/forums/${forum.id}`}
                className="saffron-underline inline-flex items-center gap-2 text-sm font-medium text-saffron-400 transition-colors duration-300 hover:text-saffron-300"
              >
                Enter Thread
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
