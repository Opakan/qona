-- ============================================================
-- QONACE: ROW-LEVEL SECURITY (RLS) MIGRATION
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/icxlfpmldbpjjqxmjpol/sql/new
--
-- Strategy:
--   1. Enable RLS on every public table (blocks all anon access).
--   2. Add a blanket service_role bypass for each table so your
--      backend (connecting via DATABASE_URL with the postgres role)
--      can continue to read/write without restriction.
--   3. Add per-user policies on user-owned tables for defense-in-depth.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ENABLE RLS ON ALL AFFECTED TABLES
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Workflow"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WorkflowVersion"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Conversation"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ConversationMessage"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ExportHistory"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subscription"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Invoice"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ApiKey"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_graphs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_patterns          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_drafts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_success_patterns  ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 2. SERVICE ROLE FULL-ACCESS POLICIES
--    Your backend connects as the postgres/service_role, so it
--    bypasses RLS automatically. These policies are for the
--    "authenticated" role used by Supabase client libs.
--    We grant full access to authenticated users at the row
--    level and let the backend handle auth/authorization logic.
-- ────────────────────────────────────────────────────────────

-- users
CREATE POLICY "service_role_all_users"
  ON public.users FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Workflow
CREATE POLICY "service_role_all_workflows"
  ON public."Workflow" FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- WorkflowVersion
CREATE POLICY "service_role_all_workflow_versions"
  ON public."WorkflowVersion" FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Conversation
CREATE POLICY "service_role_all_conversations"
  ON public."Conversation" FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ConversationMessage
CREATE POLICY "service_role_all_messages"
  ON public."ConversationMessage" FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ExportHistory
CREATE POLICY "service_role_all_exports"
  ON public."ExportHistory" FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- subscription_plans (public read for everyone, write for service_role only)
CREATE POLICY "service_role_all_plans"
  ON public.subscription_plans FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "public_read_plans"
  ON public.subscription_plans FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Subscription
CREATE POLICY "service_role_all_subscriptions"
  ON public."Subscription" FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Invoice
CREATE POLICY "service_role_all_invoices"
  ON public."Invoice" FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ApiKey
CREATE POLICY "service_role_all_api_keys"
  ON public."ApiKey" FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- internal_graphs
CREATE POLICY "service_role_all_graphs"
  ON public.internal_graphs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- workflow_planning_sessions
CREATE POLICY "service_role_all_planning_sessions"
  ON public.workflow_planning_sessions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- workflow_patterns
CREATE POLICY "service_role_all_patterns"
  ON public.workflow_patterns FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- workflow_execution_logs
CREATE POLICY "service_role_all_execution_logs"
  ON public.workflow_execution_logs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- workflow_drafts
CREATE POLICY "service_role_all_drafts"
  ON public.workflow_drafts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- workflow_success_patterns
CREATE POLICY "service_role_all_success_patterns"
  ON public.workflow_success_patterns FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 3. USER-SCOPED POLICIES (Defense-in-Depth)
--    These let authenticated users only see their OWN rows
--    if they ever access the DB directly via Supabase client.
--    Your backend service role is unaffected by these.
-- ────────────────────────────────────────────────────────────

-- users: a user can only read/update their own profile
CREATE POLICY "users_own_row"
  ON public.users FOR ALL
  TO authenticated
  USING (auth.uid()::text = "authId")
  WITH CHECK (auth.uid()::text = "authId");

-- Workflow: user can only access their own workflows
CREATE POLICY "users_own_workflows"
  ON public."Workflow" FOR ALL
  TO authenticated
  USING (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  )
  WITH CHECK (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  );

-- WorkflowVersion: user can access versions of their own workflows
CREATE POLICY "users_own_workflow_versions"
  ON public."WorkflowVersion" FOR ALL
  TO authenticated
  USING (
    "workflowId" IN (
      SELECT w.id FROM public."Workflow" w
      JOIN public.users u ON u.id = w."userId"
      WHERE u."authId" = auth.uid()::text
    )
  );

-- Conversation: user can only access their own conversations
CREATE POLICY "users_own_conversations"
  ON public."Conversation" FOR ALL
  TO authenticated
  USING (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  )
  WITH CHECK (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  );

-- ConversationMessage: user can only access messages in their conversations
CREATE POLICY "users_own_messages"
  ON public."ConversationMessage" FOR ALL
  TO authenticated
  USING (
    "conversationId" IN (
      SELECT c.id FROM public."Conversation" c
      JOIN public.users u ON u.id = c."userId"
      WHERE u."authId" = auth.uid()::text
    )
  );

-- ExportHistory: user can only see their own export history
CREATE POLICY "users_own_exports"
  ON public."ExportHistory" FOR ALL
  TO authenticated
  USING (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  );

-- Subscription: user can only see their own subscriptions
CREATE POLICY "users_own_subscriptions"
  ON public."Subscription" FOR ALL
  TO authenticated
  USING (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  );

-- Invoice: user can only see their own invoices
CREATE POLICY "users_own_invoices"
  ON public."Invoice" FOR ALL
  TO authenticated
  USING (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  );

-- ApiKey: user can only see their own API keys
CREATE POLICY "users_own_api_keys"
  ON public."ApiKey" FOR ALL
  TO authenticated
  USING (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  )
  WITH CHECK (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  );

-- internal_graphs: user can only access their own graphs
CREATE POLICY "users_own_graphs"
  ON public.internal_graphs FOR ALL
  TO authenticated
  USING (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  );

-- workflow_planning_sessions: user can only access their own sessions
CREATE POLICY "users_own_planning_sessions"
  ON public.workflow_planning_sessions FOR ALL
  TO authenticated
  USING (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  );

-- workflow_patterns: user can only access their own patterns
CREATE POLICY "users_own_patterns"
  ON public.workflow_patterns FOR ALL
  TO authenticated
  USING (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  );

-- workflow_execution_logs: user can only see their own logs
CREATE POLICY "users_own_execution_logs"
  ON public.workflow_execution_logs FOR ALL
  TO authenticated
  USING (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  );

-- workflow_drafts: user can only access their own drafts
CREATE POLICY "users_own_drafts"
  ON public.workflow_drafts FOR ALL
  TO authenticated
  USING (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  )
  WITH CHECK (
    "userId" IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
  );

-- workflow_success_patterns: no user-specific ownership, restrict to service_role only
-- (already covered by service_role policy above, anon/authenticated get no access)

-- ────────────────────────────────────────────────────────────
-- DONE. Run this entire script in the Supabase SQL Editor.
-- Your backend will continue to work unchanged.
-- Supabase's security advisor will show 0 RLS errors after this.
-- ────────────────────────────────────────────────────────────
