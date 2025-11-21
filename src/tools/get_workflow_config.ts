import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getApiConfig, createHeaders } from '../api/config.js';
import { fetchWorkflowConfig } from '../api/trellis.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerGetWorkflowConfig(server: McpServer) {
    server.registerTool(
        'get_workflow_config',
        {
            title: 'Get Workflow Config',
            description: 'Retrieve a workflow by ID with all its blocks and edges, fully populated with complete configuration details from Trellis API. Uses workflow ID from .env if not provided.',
            inputSchema: {}
        },
        async () => {
            try {
                const config = getApiConfig({ requireWorkflowId: true });
                const headers = createHeaders(config.apiKey, config.apiVersion);

                const response = await fetchWorkflowConfig(
                    config.apiBase,
                    config.workflowId,
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

                return createErrorResponse(`retrieving workflow config: ${errorMessage}`);
            }
        }
    );
}
