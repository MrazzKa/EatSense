-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_memberships_userId_idx" ON "community_memberships"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_memberships_groupId_idx" ON "community_memberships"("groupId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_posts_groupId_createdAt_idx" ON "community_posts"("groupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_posts_authorId_idx" ON "community_posts"("authorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_likes_postId_idx" ON "community_likes"("postId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_comments_postId_createdAt_idx" ON "community_comments"("postId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_reports_status_idx" ON "community_reports"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_reports_postId_idx" ON "community_reports"("postId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_reports_commentId_idx" ON "community_reports"("commentId");
