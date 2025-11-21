import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { createEntity } from '../api/trellis.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerCreateEntity(server: McpServer) {
    server.registerTool(
        'create_entity',
        {
            title: 'Create Entity',
            description: 'Create a new entity in Trellis API',
            inputSchema: {
                name: z.string().describe('Name of the entity'),
                entity_type: z.string().describe('Type of the entity'),
            }
        },
        async ({ name, entity_type }) => {
            try {
                const config = getApiConfig({ requireProjectId: true });
                const headers = createHeaders(config.apiKey, config.apiVersion);

                const response = await createEntity(
                    config.apiBase,
                    { name, entity_type, project_id: config.projectId },
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

                return createErrorResponse(`creating entity: ${errorMessage}`);
            }
        }
    );
}
