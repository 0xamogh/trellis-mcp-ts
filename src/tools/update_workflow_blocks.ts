import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { patchWorkflowBlocks } from '../api/trellis.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerUpdateWorkflowBlocks(server: McpServer) {
    server.registerTool(
        'update_workflow_blocks',
        {
            title: 'Update Workflow Blocks',
            description: 'Update blocks, edges, and deleted block IDs for a workflow in Trellis API. Uses WORKFLOW_ID from .env if not provided.',
            inputSchema: {
                blocks: z.array(z.any()).describe('Array of blocks to update or create'),
                deleted_block_ids: z.array(z.string()).optional().default([]).describe('Array of block IDs to delete'),
                edges: z.array(z.any()).optional().default([]).describe('Array of edges connecting blocks')
            }
        },
        async ({ blocks, deleted_block_ids, edges }) => {
            try {
                const config = getApiConfig({ requireWorkflowId: true });
                const headers = createHeaders(config.apiKey, config.apiVersion);

                const response = await patchWorkflowBlocks(
                    config.apiBase,
                    config.workflowId,
                    {
                        blocks,
                        deleted_block_ids: deleted_block_ids || [],
                        edges: edges || []
                    },
                    headers,
                    config.timeout
                );

                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }],
                    structuredContent: response.data
                };
            } catch (error: any) {
                const errorMessage = error.response?.data
                    ? JSON.stringify(error.response.data, null, 2)
                    : error.message;

                return createErrorResponse(`updating workflow blocks: ${errorMessage}`);
            }
        }
    );
}
