import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { planningSessionService } from '../services/planning-session.js';
import { compileInternalGraph } from '../services/n8n-compiler.js';
import type { InternalGraph } from '@qona/shared';
import { PLANNING_STATES } from '@qona/shared';
export const sessionsRouter = Router();

const LOG_PREFIX = '[Sessions]';

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const line = LOG_PREFIX + level.toUpperCase() + [ts] + message;
  const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  logger(line, data ? JSON.stringify(data) : '');
}
const BLOCKED_STATES: Record<string, string> = {
  collecting_intent: 'still collecting the initial workflow intent. No workflow data exists yet.',
  clarifying: 'still asking follow-up questions to gather workflow details.',
  generating_graph: 'confirmed but not yet marked complete. The workflow draft may still have gaps.',
};
function guardCompileState(session: { id: string; state: string; stage: number }) {
  if (session.state === 'completed') return null;
  const r = BLOCKED_STATES[session.state];
  return r || 'in an unexpected state: ' + session.state;
}
function buildBlockedResponse(session: { id: string; state: string; stage: number }) {
  const r = BLOCKED_STATES[session.state] || 'in an unexpected state: ' + session.state;
  return { compiled: false, state: session.state, stage: session.stage, sessionId: session.id, message: 'Cannot compile. The planning session is ' + r, requiredState: 'completed' };
}
sessionsRouter.get('/api/sessions', requireAuth, async (req, res, next) => {
  try {
    const sv = await planningSessionService.getByUserId(req.user!.authId);
    res.json({ traceId: req.traceId, sessions: sv });
  } catch (err) { next(err); }
});
sessionsRouter.get('/api/sessions/:id/draft', requireAuth, async (req, res, next) => {
  try {
    const id = (req.params.id as string);
    const sess = await planningSessionService.getById(id);
    if (!sess) { res.status(404).json({ error: 'Session not found' }); return; }
    res.json({ sessionId: sess.id, state: sess.state, stage: sess.stage, draft: sess.workflowDraft, missingFields: sess.missingFields, collectedAnswers: sess.collectedAnswers });
  } catch (err) { next(err); }
});
sessionsRouter.post('/api/sessions/:id/compile', requireAuth, async (req, res, next) => {
  try {
    const id = (req.params.id as string);
    const sess = await planningSessionService.getById(id);
    if (!sess) { res.status(404).json({ error: 'Session not found' }); return; }
    const block = guardCompileState(sess);
    if (block) {
      log('warn', 'Early compile attempted', { sessionId: id, state: sess.state, stage: sess.stage });
      res.status(400).json(buildBlockedResponse(sess));
      return;
    }
const g = sess.workflowDraft as InternalGraph | null;
    if (!g) { res.status(404).json({ error: 'No workflow draft found', sessionId: id, state: sess.state }); return; }
    const r = compileInternalGraph(g);
    if (!r.success || !r.workflow) {
      res.status(422).json({ compiled: false, error: 'Compilation failed', errors: r.errors, warnings: r.warnings, sessionId: id, state: sess.state });
      return;
    }
log('info', 'Workflow compiled successfully', { sessionId: id, nodeCount: r.workflow.nodes.length });
    res.json({ compiled: true, state: sess.state, sessionId: id, n8n: r.workflow, warnings: r.warnings, metadata: { workflowName: g.metadata.name || 'Untitled', nodeCount: r.workflow.nodes.length, compiledAt: new Date().toISOString() } });
  } catch (err) { next(err); }
});
sessionsRouter.get('/api/sessions/:id/compile/download', requireAuth, async (req, res, next) => {
  try {
    const id = (req.params.id as string);
    const sess = await planningSessionService.getById(id);
    if (!sess) { res.status(404).json({ error: 'Session not found' }); return; }
const block = guardCompileState(sess);
    if (block) {
      log('warn', 'Early download attempted', { sessionId: id, state: sess.state, stage: sess.stage });
      res.status(400).json(buildBlockedResponse(sess));
      return;
    }
    const g = sess.workflowDraft as InternalGraph | null;
    if (!g) { res.status(404).json({ error: 'No workflow draft found' }); return; }
    const r = compileInternalGraph(g);
    if (!r.success || !r.workflow) { res.status(422).json({ compiled: false, error: 'Compilation failed', errors: r.errors }); return; }
const fn = (g.metadata.name || 'workflow').replace(/\\s+/g, '_') + '_n8n.json';
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="' + fn + '"');
    res.send(JSON.stringify(r.workflow, null, 2));
  } catch (err) { next(err); }
});
sessionsRouter.post('/api/sessions/:id/compile/validate', requireAuth, async (req, res, next) => {
  try {
    const id = (req.params.id as string);
    const sess = await planningSessionService.getById(id);
    if (!sess) { res.status(404).json({ error: 'Session not found' }); return; }
    const block = guardCompileState(sess);
    if (block) {
      log('warn', 'Early validate attempted', { sessionId: id });
      res.status(400).json(Object.assign(buildBlockedResponse(sess), { nodeCount: 0, edgeCount: 0 }));
      return;
    }
    const g = sess.workflowDraft as InternalGraph | null;
    if (!g) { res.json({valid:false,errors:[],warnings:[],nodeCount:0,edgeCount:0,state:sess.state,sessionId:id}); return; }
    const r = compileInternalGraph(g);
    res.json({valid:r.success,errors:r.errors,warnings:r.warnings,nodeCount:g.nodes.length,edgeCount:g.edges.length,state:sess.state,sessionId:id});
  } catch (err) { next(err); }
});
