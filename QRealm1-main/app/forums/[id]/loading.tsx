import { Skeleton } from "@/components/ui/skeleton"

export default function ForumLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
