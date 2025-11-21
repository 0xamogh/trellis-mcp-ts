import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { fetchEntityFields } from '../api/trellis.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerGetEntityFields(server: McpServer) {
    server.registerTool(
        'get_entity_fields',
        {
            title: 'Get Entity Fields',
            description: 'Retrieve all fields for a specific entity from Trellis API',
            inputSchema: {
                entity_id: z.string().describe('Entity ID to retrieve fields for'),
                entity_field_id: z.string().optional().describe('Filter by specific entity field ID')
            }
        },
        async ({ entity_id, entity_field_id }) => {
            try {
                const config = getApiConfig();

                if (!entity_id) {
                    return createErrorResponse('entity_id is required');
                }

                const headers = createHeaders(config.apiKey, config.apiVersion);

                const response = await fetchEntityFields(
                    config.apiBase,
                    entity_id,
                    headers,
                    config.timeout,
                    entity_field_id
                );

                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }],
                    structuredContent: response.data
                };
            } catch (error: any) {
                const errorMessage = error.response?.data
                    ? JSON.stringify(error.response.data, null, 2)
                    : error.message;

                return createErrorResponse(`retrieving entity fields: ${errorMessage}`);
            }
        }
    );
}
