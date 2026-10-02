import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { schedulerService } from '../services/scheduler.service.js';
import { isValidCron } from '../services/cron-utils.js';

export const scheduleRouter = Router();

const UpdateScheduleSchema = z.object({
  enabled: z.boolean(),
  cron: z.string().min(3).max(100),
  timezone: z.string().max(50).optional(),
});

/**
 * GET /api/schedules
 * List all workflows for the authenticated user and their current schedule status.
 */
scheduleRouter.get('/schedules', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.authId;
    const items = await schedulerService.listUserSchedules(userId);
    res.json({
      schedules: items,
      total: items.length,
      activeCount: items.filter((i) => i.isScheduledAndActive).length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflows/:id/schedule
 * Get the schedule configuration and latest execution history for a workflow.
 */
scheduleRouter.get('/workflows/:id/schedule', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const schedule = await schedulerService.getSchedule(id);
    res.json({ schedule: schedule || null });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflows/:id/schedule
 * Set, update, or toggle the schedule for a workflow.
 */
scheduleRouter.post(
  '/workflows/:id/schedule',
  requireAuth,
  validate(UpdateScheduleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { enabled, cron, timezone } = req.body;

      if (!isValidCron(cron)) {
        res.status(400).json({
          error: 'Invalid cron format. Please provide a valid 5-part cron pattern (e.g. "0 9 * * 1" or "*/15 * * * *").',
        });
        return;
      }

      const schedule = await schedulerService.updateSchedule(id, {
        enabled,
        cron,
        timezone,
      });

      res.json({
        success: true,
        schedule,
        message: enabled
          ? `Workflow scheduled: ${schedule.humanReadable}`
          : 'Workflow schedule paused',
      });
    } catch (err: any) {
      if (err?.message?.includes('not found')) {
        res.status(404).json({ error: err.message });
      } else {
        next(err);
      }
    }
  },
);

/**
 * DELETE /api/workflows/:id/schedule
 * Remove schedule from a workflow.
 */
scheduleRouter.delete('/workflows/:id/schedule', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await schedulerService.deleteSchedule(id);
    res.json({ success: true, message: 'Schedule removed from workflow' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflows/:id/schedule/run-now
 * Trigger an immediate test execution of the scheduled workflow and log the output trace.
 */
scheduleRouter.post('/workflows/:id/schedule/run-now', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await schedulerService.triggerRun(id, 'MANUAL_TEST');
    res.json({
      success: true,
      log: result.log,
      schedule: result.schedule,
      traceSummary: result.trace?.summary || [],
      message: `Workflow test execution complete (${result.log.status.toLowerCase()}) in ${result.log.durationMs}ms`,
    });
  } catch (err: any) {
    if (err?.message?.includes('not found')) {
      res.status(404).json({ error: err.message });
    } else {
      next(err);
    }
  }
});
