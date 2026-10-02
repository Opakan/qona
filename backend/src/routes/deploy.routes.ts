import { Router, Request, Response } from 'express';
import axios from 'axios';
import { db } from '../services/db.js';
import { convertInternalToWorkflowDefinition } from '@qona/shared';

export const deployRouter = Router();

// Test n8n instance connection and API key validity
deployRouter.post('/deploy/n8n/test', async (req: Request, res: Response) => {
  try {
    const { n8nUrl, apiKey } = req.body;

    if (!n8nUrl || !apiKey) {
      return res.status(400).json({ error: 'Both n8nUrl and apiKey are required.' });
    }

    const cleanUrl = n8nUrl.trim().replace(/\/+$/, '');
    
    // Call n8n REST API to check authentication
    const response = await axios.get(`${cleanUrl}/api/v1/workflows?limit=1`, {
      headers: {
        'X-N8N-API-KEY': apiKey.trim(),
        'Accept': 'application/json',
      },
      timeout: 8000,
    });

    return res.json({
      success: true,
      message: 'Connection successful! n8n API key is valid.',
      workflowCount: response.data?.data?.length ?? 0,
    });
  } catch (err: any) {
    const status = err.response?.status;
    const message = err.response?.data?.message || err.message || 'Failed to connect to n8n instance';
    
    if (status === 401 || status === 403) {
      return res.status(401).json({ error: 'Invalid API Key. Please check your X-N8N-API-KEY in n8n settings.' });
    }
    
    return res.status(400).json({ error: `Connection failed: ${message}` });
  }
});

// Deploy workflow to n8n Cloud / Self-Hosted Instance
deployRouter.post('/deploy/n8n', async (req: Request, res: Response) => {
  try {
    const { n8nUrl, apiKey, workflowId, graph: payloadGraph, activate = false } = req.body;

    if (!n8nUrl || !apiKey) {
      return res.status(400).json({ error: 'n8n Server URL and API Key are required.' });
    }

    let graphToDeploy = payloadGraph;

    // If workflowId provided, fetch graph from database
    if (workflowId && !graphToDeploy) {
      const dbWorkflow = await db.workflow.findById(workflowId);
      if (!dbWorkflow) {
        return res.status(404).json({ error: 'Workflow not found in database.' });
      }
      graphToDeploy = dbWorkflow.definition;
    }

    if (!graphToDeploy) {
      return res.status(400).json({ error: 'No workflow graph provided for deployment.' });
    }

    // Convert internal Qonace graph format to valid n8n format
    let n8nWorkflowJson: any;
    if (graphToDeploy.triggers && graphToDeploy.actions) {
      n8nWorkflowJson = convertInternalToWorkflowDefinition(graphToDeploy);
    } else {
      // Already formatted or raw JSON graph
      n8nWorkflowJson = graphToDeploy;
    }

    const cleanUrl = n8nUrl.trim().replace(/\/+$/, '');
    const cleanApiKey = apiKey.trim();

    // Prepare payload for n8n REST API (POST /api/v1/workflows)
    const n8nPayload = {
      name: n8nWorkflowJson.name || graphToDeploy.metadata?.name || 'Qonace Deployment',
      nodes: n8nWorkflowJson.nodes || [],
      connections: n8nWorkflowJson.connections || {},
      settings: n8nWorkflowJson.settings || { executionOrder: 'v1' },
    };

    // 1. Create Workflow in n8n
    const createRes = await axios.post(`${cleanUrl}/api/v1/workflows`, n8nPayload, {
      headers: {
        'X-N8N-API-KEY': cleanApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 12000,
    });

    const deployedWf = createRes.data;
    const n8nId = deployedWf.id;

    // 2. Optionally Activate the Workflow in n8n
    let isActive = deployedWf.active || false;
    if (activate && n8nId) {
      try {
        const activateRes = await axios.post(`${cleanUrl}/api/v1/workflows/${n8nId}/activate`, {}, {
          headers: {
            'X-N8N-API-KEY': cleanApiKey,
          },
          timeout: 8000,
        });
        isActive = activateRes.data?.active ?? true;
      } catch (actErr: any) {
        console.warn(`[Deploy] Workflow created (ID: ${n8nId}), but activation warning:`, actErr.message);
      }
    }

    const editorUrl = `${cleanUrl}/workflow/${n8nId}`;

    return res.json({
      success: true,
      n8nWorkflowId: n8nId,
      name: deployedWf.name,
      active: isActive,
      editorUrl,
      message: `Successfully deployed "${deployedWf.name}" to n8n!`,
    });
  } catch (err: any) {
    console.error('[Deploy] Error deploying to n8n:', err.response?.data || err.message);
    const message = err.response?.data?.message || err.message || 'Deployment to n8n failed.';
    return res.status(500).json({ error: `n8n Deployment Error: ${message}` });
  }
});
