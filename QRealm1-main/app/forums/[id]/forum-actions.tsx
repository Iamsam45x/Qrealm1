"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { addForumComment, toggleForumLike, type Comment, type Forum } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"

function sortComments(comments: Comment[]) {
  return [...comments].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime()
    const bTime = new Date(b.createdAt).getTime()
    return aTime - bTime
  })
}

function CommentThread({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
  return (
    <div className={depth > 0 ? "mt-3 border-l border-[hsl(0,0%,100%,0.08)] pl-4" : ""}>
      <p className="text-sm text-foreground">{comment.content}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {comment.user?.name ?? "Anonymous"}
      </p>
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentThread key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ForumActions({ forum }: { forum: Forum }) {
  const { user } = useAuth()
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<Comment[]>(forum.comments ?? [])
  const [likeCount, setLikeCount] = useState(forum._count?.likes ?? 0)
  const [liked, setLiked] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingComment, setLoadingComment] = useState(false)
  const [loadingLike, setLoadingLike] = useState(false)

  const sortedComments = useMemo(() => sortComments(comments), [comments])

  async function onSubmitComment(event: React.FormEvent) {
    event.preventDefault()
    if (!commentText.trim()) return
    setError(null)
    setLoadingComment(true)
    try {
      const result = await addForumComment({ id: forum.id, content: commentText.trim() })
      if (!result.success) {
        throw new Error(result.error)
      }
      setComments((prev) => [...prev, result.data])
      setCommentText("")
    } catch (err) {
      setError((err as Error).message || "Failed to post comment")
    } finally {
      setLoadingComment(false)
    }
  }

  async function onToggleLike() {
    setError(null)
    setLoadingLike(true)
    try {
      const result = await toggleForumLike(forum.id)
      if (!result.success) {
        throw new Error(result.error)
      }
      setLiked(result.data.liked)
      setLikeCount((prev) => prev + (result.data.liked ? 1 : -1))
    } catch (err) {
      setError((err as Error).message || "Failed to toggle like")
    } finally {
      setLoadingLike(false)
    }
  }

  return (
    <div className="mt-12 space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onToggleLike}
          disabled={!user || loadingLike}
        >
          {liked ? "Unlike" : "Like"} · {likeCount}
        </Button>
        {!user && (
          <p className="text-xs text-muted-foreground">
            Login to like or comment.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Comments</h2>
        {sortedComments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No comments yet. Start the discussion.
          </p>
        )}
        {sortedComments.map((comment) => (
          <div key={comment.id} className="rounded-xl border border-[hsl(0,0%,100%,0.08)] bg-[hsl(0,0%,100%,0.02)] p-4">
            <CommentThread comment={comment} />
          </div>
        ))}
      </div>

      <form onSubmit={onSubmitComment} className="space-y-3">
        <Textarea
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder={user ? "Share your response..." : "Login to add a comment"}
          className="min-h-[120px]"
          disabled={!user}
        />
        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!user || loadingComment}>
          {loadingComment ? "Posting..." : "Post Comment"}
        </Button>
      </form>
    </div>
  )
}
