import { describe, it, expect } from 'vitest';
import { compileInternalGraph } from '../src/services/n8n-compiler.js';
import type { InternalGraph } from '@qona/shared';

describe('Binary-Aware Compilation', () => {
  it('compiles Google Drive upload correctly with extracted binary property and strips fileContent', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Google Drive Binary Test' },
      nodes: [
        {
          id: 'n1',
          type: 'webhook',
          label: 'HTTP Request',
          position: { x: 100, y: 100 },
        },
        {
          id: 'n2',
          type: 'google_drive',
          label: 'Google Drive Upload',
          position: { x: 300, y: 100 },
          config: {
            operation: 'upload',
            resource: 'file',
            fileContent: '{{ $node["HTTP Request"].binary.my_custom_file }}',
          },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const driveNode = result.workflow!.nodes.find((n) => n.id === 'n2')!;
    expect(driveNode.parameters.binaryData).toBe(true);
    expect(driveNode.parameters.binaryPropertyName).toBe('my_custom_file');
    expect(driveNode.parameters.fileContent).toBeUndefined();
  });

  it('compiles Send Email SMTP correctly with attachments parameter and strips fileContent', () => {
    const graph: InternalGraph = {
      metadata: { name: 'SMTP Attachments Test' },
      nodes: [
        {
          id: 'n1',
          type: 'webhook',
          label: 'Email Trigger',
          position: { x: 100, y: 100 },
        },
        {
          id: 'n2',
          type: 'send_email',
          label: 'Send Email SMTP',
          position: { x: 300, y: 100 },
          config: {
            to: 'receiver@example.com',
            subject: 'Forwarding attachment',
            attachments: '{{ $node["Email Trigger"].binary.attachment_0 }}',
          },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const emailNode = result.workflow!.nodes.find((n) => n.id === 'n2')!;
    expect(emailNode.parameters.attachments).toBe('attachment_0');
    expect(emailNode.parameters.fileContent).toBeUndefined();
  });

  it('compiles S3 upload correctly with arbitrary binary property', () => {
    const graph: InternalGraph = {
      metadata: { name: 'S3 Test' },
      nodes: [
        {
          id: 'n1',
          type: 'webhook',
          label: 'HTTP Request',
          position: { x: 100, y: 100 },
        },
        {
          id: 'n2',
          type: 's3',
          label: 'S3 Upload',
          position: { x: 300, y: 100 },
          config: {
            bucketName: 'my-bucket',
            key: 'file.txt',
            fileContent: '{{ $json.attachment_data }}',
          },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const s3Node = result.workflow!.nodes.find((n) => n.id === 'n2')!;
    expect(s3Node.parameters.binaryData).toBe(true);
    expect(s3Node.parameters.binaryPropertyName).toBe('attachment_data');
    expect(s3Node.parameters.fileContent).toBeUndefined();
  });

  it('resolves binary property name using node type when no specific property is in expression', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Slack File Default' },
      nodes: [
        {
          id: 'n1',
          type: 'webhook',
          label: 'HTTP Request',
          position: { x: 100, y: 100 },
        },
        {
          id: 'n2',
          type: 'slack',
          label: 'Slack Upload',
          position: { x: 300, y: 100 },
          config: {
            channel: 'general',
            fileContent: '{{ $node["HTTP Request"] }}',
          },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const slackNode = result.workflow!.nodes.find((n) => n.id === 'n2')!;
    expect(slackNode.parameters.binaryData).toBe(true);
    expect(slackNode.parameters.binaryPropertyName).toBe('attachment_0'); // Trigger nodes (webhook) resolve to attachment_0
    expect(slackNode.parameters.fileContent).toBeUndefined();
  });

  it('resolves attachment_0 for email trigger node reference', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Dropbox Email Attachment' },
      nodes: [
        {
          id: 'n1',
          type: 'webhook',
          label: 'Email Trigger',
          position: { x: 100, y: 100 },
        },
        {
          id: 'n2',
          type: 'dropbox',
          label: 'Dropbox Upload',
          position: { x: 300, y: 100 },
          config: {
            path: '/uploads/my-doc.pdf',
            fileContent: '{{ $node["Email Trigger"] }}',
          },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const dropboxNode = result.workflow!.nodes.find((n) => n.id === 'n2')!;
    expect(dropboxNode.parameters.binaryData).toBe(true);
    expect(dropboxNode.parameters.binaryPropertyName).toBe('attachment_0');
    expect(dropboxNode.parameters.fileContent).toBeUndefined();
  });
});
