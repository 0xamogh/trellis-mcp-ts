import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { fetchEntities } from '../api/trellis.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerGetEntities(server: McpServer) {
    server.registerTool(
        'get_entities',
        {
            title: 'Get Entities',
            description: 'Retrieve entities from Trellis API with optional filtering. Uses PROJECT_ID from .env if not provided.',
            inputSchema: {
                project_id: z.string().optional().describe('Project ID (defaults to PROJECT_ID from .env)'),
                entity_id: z.string().optional().describe('Entity ID to retrieve a specific entity'),
                primary_only: z.boolean().optional().default(false).describe('Get only primary entities'),
                exclude_playground: z.boolean().optional().default(false).describe('Exclude playground entities'),
                limit: z.number().optional().default(20).describe('Number of results to return (default: 20)'),
                offset: z.number().optional().default(0).describe('Offset for pagination (default: 0)'),
                order_by: z.string().optional().default('updated_at').describe('Field to order by (default: updated_at)'),
                order: z.enum(['asc', 'desc']).optional().default('desc').describe('Order direction')
            }
        },
        async ({ entity_id, primary_only, exclude_playground, limit, offset, order_by, order }) => {
            try {
                const config = getApiConfig({ requireProjectId: true });
                const headers = createHeaders(config.apiKey, config.apiVersion);

                const response = await fetchEntities(
                    config.apiBase,
                    config.projectId,
                    headers,
                    config.timeout,
                    { entity_id, primary_only, exclude_playground, limit, offset, order_by, order }
                );

                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }],
                    structuredContent: response.data
                };
            } catch (error: any) {
                const errorMessage = error.response?.data
                    ? JSON.stringify(error.response.data, null, 2)
                    : error.message;

                return createErrorResponse(`retrieving entities: ${errorMessage}`);
            }
        }
    );
}
