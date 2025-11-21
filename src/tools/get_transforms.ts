import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { fetchTransforms } from '../api/trellis.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerGetTransforms(server: McpServer) {
    server.registerTool(
        'get_transforms',
        {
            title: 'Get Transforms',
            description: 'Retrieve all transformations associated with you from Trellis API with optional filtering',
            inputSchema: {
                search_term: z.string().optional().describe('Search term to filter transformations against their id and name'),
                transform_ids: z.array(z.string()).optional().describe('List of transform IDs to retrieve'),
                include_transform_params: z.boolean().optional().default(true).describe('Boolean flag to include transform params'),
                limit: z.number().optional().default(20).describe('Number of results to return (default: 20)'),
                offset: z.number().optional().default(0).describe('Offset for pagination (default: 0)'),
                order_by: z.enum(['updated_at', 'created_at', 'id']).optional().default('updated_at').describe('Field to order by'),
                order: z.enum(['asc', 'desc']).optional().default('desc').describe('Order direction')
            }
        },
        async ({ search_term, transform_ids, include_transform_params, limit, offset, order_by, order }) => {
            try {
                const config = getApiConfig();
                const headers = createHeaders(config.apiKey, config.apiVersion);
                const response = await fetchTransforms(
                    config.apiBase,
                    headers,
                    config.timeout,
                    { search_term, transform_ids, include_transform_params, limit, offset, order_by, order }
                );

                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }],
                    structuredContent: response.data
                };
            } catch (error: any) {
                const errorMessage = error.response?.data
                    ? JSON.stringify(error.response.data, null, 2)
                    : error.message;

                return createErrorResponse(`retrieving transforms: ${errorMessage}`);
            }
        }
    );
}
