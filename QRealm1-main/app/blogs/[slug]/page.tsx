import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { getBlogBySlug } from "@/lib/api"
import { BlogActions } from "./blog-actions"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function toParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cookie = (await headers()).get("cookie") ?? ""
  const result = await getBlogBySlug(slug, { cookie })

  if (!result || result.success === false) {
    notFound()
  }

  const blog = result.data
  const paragraphs = toParagraphs(blog.content)

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 md:py-24">
      <Link
        href="/blogs"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
      >
        <span aria-hidden>←</span>
        Back to Blogs
      </Link>

      <header>
        <time className="text-xs font-medium text-muted-foreground">
          {formatDate(blog.createdAt)}
        </time>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">
          {blog.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          By {blog.author?.name ?? "Unknown author"}
        </p>
      </header>

      <Separator className="my-8 bg-primary/20" />

      <article className="flex flex-col gap-6">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="leading-relaxed text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </article>

      <BlogActions blog={blog} />
    </div>
  )
}
