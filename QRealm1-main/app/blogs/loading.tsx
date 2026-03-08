import { Skeleton } from "@/components/ui/skeleton"

export default function BlogsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 md:py-24 space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
