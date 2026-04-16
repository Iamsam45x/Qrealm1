"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { addBlogComment, toggleBlogLike, createLearningInteraction, createUserReport, type Blog, type Comment } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"
import { AlertTriangle } from "lucide-react"

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

export function BlogActions({ blog }: { blog: Blog }) {
  const { user } = useAuth()
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<Comment[]>(blog.comments ?? [])
  const [likeCount, setLikeCount] = useState(blog._count?.likes ?? 0)
  const [liked, setLiked] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingComment, setLoadingComment] = useState(false)
  const [loadingLike, setLoadingLike] = useState(false)
  
  const [learningDialogOpen, setLearningDialogOpen] = useState(false)
  const [submissionType, setSubmissionType] = useState<"ERROR_REPORT" | "DOUBT">("ERROR_REPORT")
  const [learningContent, setLearningContent] = useState("")
  const [learningLoading, setLearningLoading] = useState(false)
  const [learningSubmitted, setLearningSubmitted] = useState(false)

  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportLoading, setReportLoading] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)

  const sortedComments = useMemo(() => sortComments(comments), [comments])

  async function onSubmitLearningInteraction() {
    if (!learningContent.trim()) return
    setLearningLoading(true)
    try {
      const result = await createLearningInteraction({
        targetType: "blog",
        targetId: blog.slug || blog.id,
        interactionType: submissionType,
        content: learningContent.trim()
      })
      if (!result.success) {
        throw new Error(result.error)
      }
      setLearningSubmitted(true)
      setTimeout(() => setLearningDialogOpen(false), 2000)
    } catch (err) {
      setError((err as Error).message || "Failed to submit")
    } finally {
      setLearningLoading(false)
    }
  }

  async function onSubmitComment(event: React.FormEvent) {
    event.preventDefault()
    if (!commentText.trim()) return
    setError(null)
    setLoadingComment(true)
    try {
      const result = await addBlogComment({ id: blog.id, content: commentText.trim() })
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
      const result = await toggleBlogLike(blog.id)
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

  function handleDialogClose(open: boolean) {
    setLearningDialogOpen(open)
    if (!open) {
      setLearningSubmitted(false)
      setLearningContent("")
    }
  }

  async function onSubmitReport() {
    if (!reportReason.trim()) return
    setReportLoading(true)
    try {
      const result = await createUserReport({
        targetType: "blog",
        targetId: blog.id,
        reason: reportReason.trim()
      })
      if (!result.success) {
        throw new Error(result.error)
      }
      setReportSubmitted(true)
      setTimeout(() => {
        setReportDialogOpen(false)
        setReportSubmitted(false)
        setReportReason("")
      }, 2000)
    } catch (err) {
      setError((err as Error).message || "Failed to submit report")
    } finally {
      setReportLoading(false)
    }
  }

  function handleReportDialogClose(open: boolean) {
    setReportDialogOpen(open)
    if (!open) {
      setReportSubmitted(false)
      setReportReason("")
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
        
        <Dialog open={learningDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="border-saffron-500/30 text-saffron-400 hover:bg-saffron-500/10">
              Help Us Improve
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Error Report or Doubt</DialogTitle>
            </DialogHeader>
            {learningSubmitted ? (
              <div className="text-center py-4">
                <p className="text-green-400 text-lg mb-2">Submission Received</p>
                <p className="text-sm text-muted-foreground">
                  Your submission is under review. If it is an error, it will be corrected. If it is a doubt, you will receive an explanation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">What would you like to submit?</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={submissionType === "ERROR_REPORT" ? "default" : "outline"}
                      onClick={() => setSubmissionType("ERROR_REPORT")}
                      className={submissionType === "ERROR_REPORT" ? "bg-red-600 hover:bg-red-500" : ""}
                    >
                      Error Report
                    </Button>
                    <Button
                      type="button"
                      variant={submissionType === "DOUBT" ? "default" : "outline"}
                      onClick={() => setSubmissionType("DOUBT")}
                      className={submissionType === "DOUBT" ? "bg-blue-600 hover:bg-blue-500" : ""}
                    >
                      Ask a Doubt
                    </Button>
                  </div>
                </div>

                {submissionType === "ERROR_REPORT" && (
                  <p className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded">
                    Not sure if it's an error? Ask as a doubt instead.
                  </p>
                )}

                <Textarea
                  value={learningContent}
                  onChange={(e) => setLearningContent(e.target.value)}
                  placeholder={submissionType === "ERROR_REPORT" 
                    ? "Describe what you believe is incorrect and why..."
                    : "What concept or explanation do you not understand?"}
                  className="min-h-[120px]"
                />

                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}

                <Button 
                  onClick={onSubmitLearningInteraction} 
                  disabled={learningLoading || !learningContent.trim()}
                  className="w-full"
                >
                  {learningLoading ? "Submitting..." : "Submit"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={reportDialogOpen} onOpenChange={handleReportDialogClose}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Content</DialogTitle>
            </DialogHeader>
            {reportSubmitted ? (
              <div className="text-center py-4">
                <p className="text-green-400 text-lg mb-2">Report Submitted</p>
                <p className="text-sm text-muted-foreground">
                  Thank you. Our team will review this report.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Please describe why you are reporting this content. Your report will be reviewed by our moderation team.
                </p>
                <Textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Reason for reporting..."
                  className="min-h-[120px]"
                />
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
                <Button 
                  onClick={onSubmitReport} 
                  disabled={reportLoading || !reportReason.trim()}
                  className="w-full bg-red-600 hover:bg-red-500"
                >
                  {reportLoading ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {!user && (
          <p className="text-xs text-muted-foreground">
            Login to like, comment, or submit error reports.
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