/*
  Warnings:

  - The `status` column on the `Workflow` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Workflow" DROP COLUMN "status",
ADD COLUMN     "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "country" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "exports" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentPeriod" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_graphs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_graphs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_planning_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'collecting_intent',
    "collectedAnswers" JSONB NOT NULL DEFAULT '{}',
    "missingFields" JSONB NOT NULL DEFAULT '[]',
    "extractedIntent" JSONB,
    "workflowDraft" JSONB,
    "internalGraphId" TEXT,
    "conversationId" TEXT,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_planning_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_patterns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerLabel" TEXT NOT NULL DEFAULT '',
    "actionTypes" JSONB NOT NULL DEFAULT '[]',
    "integrationTypes" JSONB NOT NULL DEFAULT '[]',
    "graphSnapshot" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_execution_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patternId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_success_patterns" (
    "id" TEXT NOT NULL,
    "patternId" TEXT,
    "triggerType" TEXT NOT NULL,
    "actionTypes" JSONB NOT NULL DEFAULT '[]',
    "integrationTypes" JSONB NOT NULL DEFAULT '[]',
    "successCount" INTEGER NOT NULL DEFAULT 1,
    "avgConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_success_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "internalGraph" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerRef_key" ON "Subscription"("providerRef");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_providerRef_key" ON "Invoice"("providerRef");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "internal_graphs_userId_idx" ON "internal_graphs"("userId");

-- CreateIndex
CREATE INDEX "internal_graphs_status_idx" ON "internal_graphs"("status");

-- CreateIndex
CREATE INDEX "workflow_planning_sessions_userId_idx" ON "workflow_planning_sessions"("userId");

-- CreateIndex
CREATE INDEX "workflow_planning_sessions_state_idx" ON "workflow_planning_sessions"("state");

-- CreateIndex
CREATE INDEX "workflow_patterns_userId_idx" ON "workflow_patterns"("userId");

-- CreateIndex
CREATE INDEX "workflow_patterns_triggerType_idx" ON "workflow_patterns"("triggerType");

-- CreateIndex
CREATE INDEX "workflow_patterns_success_idx" ON "workflow_patterns"("success");

-- CreateIndex
CREATE INDEX "workflow_patterns_createdAt_idx" ON "workflow_patterns"("createdAt");

-- CreateIndex
CREATE INDEX "workflow_execution_logs_userId_idx" ON "workflow_execution_logs"("userId");

-- CreateIndex
CREATE INDEX "workflow_execution_logs_patternId_idx" ON "workflow_execution_logs"("patternId");

-- CreateIndex
CREATE INDEX "workflow_execution_logs_status_idx" ON "workflow_execution_logs"("status");

-- CreateIndex
CREATE INDEX "workflow_execution_logs_executedAt_idx" ON "workflow_execution_logs"("executedAt");

-- CreateIndex
CREATE INDEX "workflow_success_patterns_triggerType_idx" ON "workflow_success_patterns"("triggerType");

-- CreateIndex
CREATE INDEX "workflow_success_patterns_successCount_idx" ON "workflow_success_patterns"("successCount");

-- CreateIndex
CREATE INDEX "workflow_success_patterns_lastUsedAt_idx" ON "workflow_success_patterns"("lastUsedAt");

-- CreateIndex
CREATE INDEX "workflow_drafts_userId_idx" ON "workflow_drafts"("userId");

-- CreateIndex
CREATE INDEX "workflow_drafts_createdAt_idx" ON "workflow_drafts"("createdAt");

-- CreateIndex
CREATE INDEX "Workflow_status_idx" ON "Workflow"("status");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_graphs" ADD CONSTRAINT "internal_graphs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_planning_sessions" ADD CONSTRAINT "workflow_planning_sessions_internalGraphId_fkey" FOREIGN KEY ("internalGraphId") REFERENCES "internal_graphs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_planning_sessions" ADD CONSTRAINT "workflow_planning_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_patterns" ADD CONSTRAINT "workflow_patterns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_execution_logs" ADD CONSTRAINT "workflow_execution_logs_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "workflow_patterns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_execution_logs" ADD CONSTRAINT "workflow_execution_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_success_patterns" ADD CONSTRAINT "workflow_success_patterns_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "workflow_patterns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_drafts" ADD CONSTRAINT "workflow_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
