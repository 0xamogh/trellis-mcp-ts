import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import axios from 'axios';
import dotenv from 'dotenv';
import { getAvailableActionTypes } from './constants.js';

dotenv.config();

const server = new McpServer({
    name: 'demo-server',
    version: '1.0.0'
});

server.registerTool(
    'get_workflow_config',
    {
        title: 'Get Workflow Config',
        description: 'Retrieve a workflow by ID with all its blocks and edges, fully populated with complete configuration details from Trellis API. Uses workflow ID from .env if not provided.',
        inputSchema: {
        }
    },
    async () => {
        const apiKey = process.env.TRELLIS_API_KEY;
        const apiBase = process.env.TRELLIS_API_BASE
        const workflowId = process.env.WORKFLOW_ID;
        const apiVersion = '2025-03';

        if (!apiKey) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: TRELLIS_API_KEY not found in environment variables'
                }],
                isError: true
            };
        }

        if (!workflowId) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: workflow_id not provided and WORKFLOW_ID not found in environment variables'
                }],
                isError: true
            };
        }

        try {
            const response = await axios.get(
                `${apiBase}/workflows/${workflowId}/config`,
                {
                    headers: {
                        'accept': 'application/json',
                        'API-Version': apiVersion,
                        'Authorization': apiKey
                    },
                    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30') * 1000
                }
            );

            return {
                content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
                structuredContent: response.data
            };
        } catch (error: any) {
            const errorMessage = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : error.message;

            return {
                content: [{
                    type: 'text',
                    text: `Error retrieving workflow config: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

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
        const apiKey = process.env.TRELLIS_API_KEY;
        const apiBase = process.env.TRELLIS_API_BASE
        const apiVersion = '2025-03';

        if (!apiKey) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: TRELLIS_API_KEY not found in environment variables'
                }],
                isError: true
            };
        }

        try {
            const params = new URLSearchParams();

            if (search_term) params.append('search_term', search_term);
            if (transform_ids) transform_ids.forEach(id => params.append('transform_ids', id));
            if (include_transform_params !== undefined) params.append('include_transform_params', include_transform_params.toString());
            if (limit !== undefined) params.append('limit', limit.toString());
            if (offset !== undefined) params.append('offset', offset.toString());
            if (order_by) params.append('order_by', order_by);
            if (order) params.append('order', order);

            const response = await axios.get(
                `${apiBase}/transforms?${params.toString()}`,
                {
                    headers: {
                        'accept': 'application/json',
                        'API-Version': apiVersion,
                        'Authorization': apiKey
                    },
                    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30') * 1000
                }
            );

            return {
                content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
                structuredContent: response.data
            };
        } catch (error: any) {
            const errorMessage = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : error.message;

            return {
                content: [{
                    type: 'text',
                    text: `Error retrieving transforms: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

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
        const apiKey = process.env.TRELLIS_API_KEY;
        const apiBase = process.env.TRELLIS_API_BASE
        const projectId = process.env.PROJECT_ID;
        const apiVersion = '2025-03';

        if (!apiKey) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: TRELLIS_API_KEY not found in environment variables'
                }],
                isError: true
            };
        }

        if (!projectId) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: project_id not provided and PROJECT_ID not found in environment variables'
                }],
                isError: true
            };
        }

        try {
            const params = new URLSearchParams();
            params.append('project_id', projectId);

            if (entity_id) params.append('entity_id', entity_id);
            if (primary_only !== undefined) params.append('primary_only', primary_only.toString());
            if (exclude_playground !== undefined) params.append('exclude_playground', exclude_playground.toString());
            if (limit !== undefined) params.append('limit', limit.toString());
            if (offset !== undefined) params.append('offset', offset.toString());
            if (order_by) params.append('order_by', order_by);
            if (order) params.append('order', order);

            const response = await axios.get(
                `${apiBase}/entities?${params.toString()}`,
                {
                    headers: {
                        'accept': 'application/json',
                        'API-Version': apiVersion,
                        'Authorization': apiKey
                    },
                    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30') * 1000
                }
            );

            return {
                content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
                structuredContent: response.data
            };
        } catch (error: any) {
            const errorMessage = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : error.message;

            return {
                content: [{
                    type: 'text',
                    text: `Error retrieving entities: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

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
        const apiKey = process.env.TRELLIS_API_KEY;
        const apiBase = process.env.TRELLIS_API_BASE
        const apiVersion = '2025-03';

        if (!apiKey) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: TRELLIS_API_KEY not found in environment variables'
                }],
                isError: true
            };
        }

        if (!entity_id) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: entity_id is required'
                }],
                isError: true
            };
        }

        try {
            const params = new URLSearchParams();
            if (entity_field_id) params.append('entity_field_id', entity_field_id);

            const url = `${apiBase}/entities/${entity_id}/fields${params.toString() ? '?' + params.toString() : ''}`;

            const response = await axios.get(
                url,
                {
                    headers: {
                        'accept': 'application/json',
                        'API-Version': apiVersion,
                        'Authorization': apiKey
                    },
                    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30') * 1000
                }
            );

            return {
                content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
                structuredContent: response.data
            };
        } catch (error: any) {
            const errorMessage = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : error.message;

            return {
                content: [{
                    type: 'text',
                    text: `Error retrieving entity fields: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

server.registerTool(
    'get_available_action_types',
    {
        title: 'Get Available Action Types',
        description: 'Get all available action types (WorkflowActionType values)',
        inputSchema: {}
    },
    async () => {
        const actionTypes = getAvailableActionTypes();

        return {
            content: [{ type: 'text', text: JSON.stringify(actionTypes, null, 2) }],
            structuredContent: { action_types: actionTypes }
        };
    }
);

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
        const apiKey = process.env.TRELLIS_API_KEY;
        const apiBase = process.env.TRELLIS_API_BASE;
        const projectId = process.env.PROJECT_ID;
        const apiVersion = '2025-03';

        if (!apiKey) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: TRELLIS_API_KEY not found in environment variables'
                }],
                isError: true
            };
        }

        if (!projectId) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: project_id not provided and PROJECT_ID not found in environment variables'
                }],
                isError: true
            };
        }

        try {
            const requestBody = {
                name,
                entity_type,
                project_id: projectId
            };

            const response = await axios.post(
                `${apiBase}/v1/entities`,
                requestBody,
                {
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                        'API-Version': apiVersion,
                        'Authorization': apiKey
                    },
                    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30') * 1000
                }
            );

            return {
                content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
                structuredContent: response.data
            };
        } catch (error: any) {
            const errorMessage = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : error.message;

            return {
                content: [{
                    type: 'text',
                    text: `Error creating entity: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

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
        const apiKey = process.env.TRELLIS_API_KEY;
        const apiBase = process.env.TRELLIS_API_BASE
        const workflowId = process.env.WORKFLOW_ID;
        const apiVersion = '2025-03';

        if (!apiKey) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: TRELLIS_API_KEY not found in environment variables'
                }],
                isError: true
            };
        }

        if (!workflowId) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: workflow_id not provided and WORKFLOW_ID not found in environment variables'
                }],
                isError: true
            };
        }

        try {
            const requestBody = {
                blocks,
                deleted_block_ids: deleted_block_ids || [],
                edges: edges || []
            };

            const response = await axios.patch(
                `${apiBase}/workflows/${workflowId}/blocks`,
                requestBody,
                {
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                        'API-Version': apiVersion,
                        'Authorization': apiKey
                    },
                    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30') * 1000
                }
            );

            return {
                content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
                structuredContent: response.data
            };
        } catch (error: any) {
            const errorMessage = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : error.message;

            return {
                content: [{
                    type: 'text',
                    text: `Error updating workflow blocks: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

server.registerTool(
    'add_code_eval_after_block',
    {
        title: 'Add Code Eval After Block',
        description: 'Insert a code-evaluation step after a specific existing block in a Trellis workflow, and optionally persist the returned value into a field on a target entity',
        inputSchema: {
            after_block_id: z.string().describe('Existing block ID where the new code-eval block should attach'),
            entity_name: z.string().describe('Human entity name for update_record (e.g. "Referral")'),
            target_field_name: z.string().describe('Human field name on that entity'),
            code: z.string().describe('JavaScript code that returns the final value (IIFE recommended)')
        }
    },
    async ({ after_block_id, entity_name, target_field_name, code }) => {
        const apiKey = process.env.TRELLIS_API_KEY;
        const apiBase = process.env.TRELLIS_API_BASE;
        const projectId = process.env.PROJECT_ID;
        const workflowId = process.env.WORKFLOW_ID;
        const apiVersion = '2025-03';

        if (!apiKey) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: TRELLIS_API_KEY not found in environment variables'
                }],
                isError: true
            };
        }

        if (!apiBase) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: TRELLIS_API_BASE not found in environment variables'
                }],
                isError: true
            };
        }

        if (!projectId) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: PROJECT_ID not found in environment variables'
                }],
                isError: true
            };
        }

        if (!workflowId) {
            return {
                content: [{
                    type: 'text',
                    text: 'Error: WORKFLOW_ID not found in environment variables'
                }],
                isError: true
            };
        }

        try {
            const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30') * 1000;
            const headers = {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'API-Version': apiVersion,
                'Authorization': apiKey
            };

            const entitiesParams = new URLSearchParams();
            entitiesParams.append('project_id', projectId);

            const entitiesResponse = await axios.get(
                `${apiBase}/entities?${entitiesParams.toString()}`,
                { headers, timeout }
            );

const rawEntities = entitiesResponse.data;
const entities = Array.isArray(rawEntities)
  ? rawEntities
  : Array.isArray((rawEntities as any).entities)
    ? (rawEntities as any).entities
    : [];

if (!Array.isArray(entities)) {
  return {
    content: [{
      type: 'text',
      text: `Error: Unexpected entities response shape: ${JSON.stringify(rawEntities).slice(0, 500)}`
    }],
    isError: true
  };
}
            const matchingEntities = entities.filter((e: any) =>
                e.name.toLowerCase() === entity_name.toLowerCase()
            );

            if (matchingEntities.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: No entity found with name "${entity_name}"`
                    }],
                    isError: true
                };
            }

            if (matchingEntities.length > 1) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: Multiple entities found with name "${entity_name}"`
                    }],
                    isError: true
                };
            }

            const entity_id = matchingEntities[0].id;

            const fieldsResponse = await axios.get(
                `${apiBase}/entities/${entity_id}/fields`,
                { headers, timeout }
            );

const rawFields = fieldsResponse.data;
const fields = Array.isArray(rawFields)
  ? rawFields
  : Array.isArray((rawFields as any).fields)
    ? (rawFields as any).fields
    : [];
                const matchingFields = fields.filter((f: any) =>
                f.name.toLowerCase() === target_field_name.toLowerCase()
            );

            if (matchingFields.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: No field found with name "${target_field_name}" on entity "${entity_name}"`
                    }],
                    isError: true
                };
            }

            if (matchingFields.length > 1) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: Multiple fields found with name "${target_field_name}" on entity "${entity_name}"`
                    }],
                    isError: true
                };
            }

            const entity_field_id = matchingFields[0].id;

            const workflowResponse = await axios.get(
                `${apiBase}/workflows/${workflowId}/config`,
                { headers, timeout }
            );

            const existingBlocks = workflowResponse.data.blocks 
  || workflowResponse.data.nodes 
  || [];
const existingEdges = workflowResponse.data.edges || [];

            const afterBlockExists = existingBlocks.some((b: any) => b.id === after_block_id);
            if (!afterBlockExists) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: Block with ID "${after_block_id}" not found in workflow`
                    }],
                    isError: true
                };
            }

            const codeEvalBlockId = `code_eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const codeEvalBlock = {
                id: codeEvalBlockId,
                block_type: "action",
                type: "eval_code",
                name: "Code Eval",
                code_eval_config: {
                    code: code
                }
            };

            const updateRecordBlockId = `update_record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const updateRecordBlock = {
                id: updateRecordBlockId,
                block_type: "action",
                type: "update_record",
                name: "Update Record",
                entity_id: entity_id,
                record_reference_config: {
                    record_reference: "{{event.row_id}}"
                },
                mapping_config: {
                    mapping: {
                        [entity_field_id]: `{{${codeEvalBlockId}}}`
                    }
                }
            };

            const edgeA = {
                id: `edge_${after_block_id}_${codeEvalBlockId}`,
                source: after_block_id,
                target: codeEvalBlockId,
                animated: true
            };

            const edgeB = {
                id: `edge_${codeEvalBlockId}_${updateRecordBlockId}`,
                source: codeEvalBlockId,
                target: updateRecordBlockId,
                animated: true
            };

            const requestBody = {
                blocks: [...existingBlocks, codeEvalBlock, updateRecordBlock],
                edges: [...existingEdges, edgeA, edgeB],
                deleted_block_ids: []
            };

            const response = await axios.patch(
                `${apiBase}/workflows/${workflowId}/blocks`,
                requestBody,
                { headers, timeout }
            );

            return {
                content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
                structuredContent: response.data
            };
        } catch (error: any) {
            const errorMessage = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : error.message;

            return {
                content: [{
                    type: 'text',
                    text: `Error adding code eval after block: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });

    res.on('close', () => {
        transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || '3000');
app.listen(port, () => {
    console.error(`Demo MCP Server running on http://localhost:${port}/mcp`);
}).on('error', error => {
    console.error('Server error:', error);
    process.exit(1);
});
