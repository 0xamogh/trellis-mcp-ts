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
        description: 'Insert a code-evaluation step after a specific existing block in a Trellis workflow, and persist the returned value into a field on a target entity',
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

            //
            // 1) Resolve entity_id from entity_name
            //
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

            //
            // 2) Resolve entity_field_id from target_field_name
            //
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

            if (!Array.isArray(fields)) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: Unexpected fields response shape: ${JSON.stringify(rawFields).slice(0, 500)}`
                    }],
                    isError: true
                };
            }

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

            //
            // 3) Load workflow config to:
            //    - Validate after_block_id exists
            //    - Get its position_x, position_y for layout
            //
            const workflowResponse = await axios.get(
                `${apiBase}/workflows/${workflowId}/config`,
                { headers, timeout }
            );

            const nodes = workflowResponse.data.nodes || [];
            const edgesFromConfig = workflowResponse.data.edges || [];

            const afterBlock = nodes.find((b: any) => b.id === after_block_id);

            if (!afterBlock) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: Block with ID "${after_block_id}" not found in workflow`
                    }],
                    isError: true
                };
            }

            const baseX = typeof afterBlock.position_x === 'number' ? afterBlock.position_x : 0;
            const baseY = typeof afterBlock.position_y === 'number' ? afterBlock.position_y : 0;

            //
            // 4) Build new ExtendedActionWorkflowBlock instances
            //    (These must match ExtendedActionWorkflowBlock + EvalCodeActionSchema + ExtendedUpdateRecordActionSchema)
            //
            const codeEvalBlockId = `code_eval_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const codeEvalConfigId = `code_eval_cfg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const recordConfigId = `rec_cfg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const mappingConfigId = `map_cfg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const updateRecordBlockId = `update_record_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

            const codeEvalBlock = {
                id: codeEvalBlockId,
                workflow_id: workflowId,
                name: 'Code Evaluation',
                type: 'action' as const,
                position: {
                    x: baseX,
                    y: baseY + 120
                },
                event_filter_metadata: {},
                action: {
                    name: 'eval_code' as const,
                    code_eval_config: {
                        id: codeEvalConfigId,
                        code
                    }
                }
            };

            const updateRecordBlock = {
                id: updateRecordBlockId,
                workflow_id: workflowId,
                name: 'Update Record (Notes)',
                type: 'action' as const,
                position: {
                    x: baseX,
                    y: baseY + 240
                },
                event_filter_metadata: {},
                action: {
                    name: 'update_record' as const,
                    entity_id,
                    record_reference_config: {
                        id: recordConfigId,
                        record_reference: '{{event.row_id}}',
                        filters: {}
                    },
                    mapping_config: {
                        id: mappingConfigId,
                        mapping: {
                            [entity_field_id]: `{{${codeEvalBlockId}}}`
                        },
                        mapping_reference: undefined
                    },
                    reference_type: 'record_reference' as const
                }
            };

            //
            // 5) Build new edges (WorkflowEdge shape; extra fields are fine)
            //
            const edgeA = {
                source: after_block_id,
                target: codeEvalBlockId
            };

            const edgeB = {
                source: codeEvalBlockId,
                target: updateRecordBlockId
            };

            // Include existing edges to avoid wiping the graph
            const newEdges = [
                ...edgesFromConfig.map((e: any) => ({
                    source: e.source,
                    target: e.target
                })),
                edgeA,
                edgeB
            ];

            //
            // 6) PATCH /v1/workflows/{workflow_id}/blocks
            //    Only send NEW blocks; API treats them as upserts.
            //
            const requestBody = {
                blocks: [codeEvalBlock, updateRecordBlock],
                deleted_block_ids: [],
                edges: newEdges
            };

            const response = await axios.patch(
                `${apiBase}/v1/workflows/${workflowId}/blocks`,
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

server.registerTool(
    'create_row_created_trigger_for_entity',
    {
        title: 'Create Row Created Trigger For Entity',
        description: 'Create (or return) a Row Created trigger block for a specific entity in the current workflow. This is the entry point for all row-creation-based workflows.',
        inputSchema: {
            entity_name: z.string().describe('Human-facing name of the entity (case-insensitive)'),
            position_x: z.number().optional().describe('X position for the trigger block (default: 300)'),
            position_y: z.number().optional().describe('Y position for the trigger block (default: 50)')
        }
    },
    async ({ entity_name, position_x, position_y }) => {
        const apiKey = process.env.TRELLIS_API_KEY;
        const apiBase = process.env.TRELLIS_API_BASE;
        const projectId = process.env.PROJECT_ID;
        const workflowId = process.env.WORKFLOW_ID;
        const apiVersion = '2025-03';

        // Validate required env vars
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

            // Step 1: Resolve entity_name → entity_id
            const entitiesParams = new URLSearchParams();
            entitiesParams.append('project_id', projectId);

            const entitiesResponse = await axios.get(
                `${apiBase}/entities?${entitiesParams.toString()}`,
                { headers, timeout }
            );

            const rawEntities = entitiesResponse.data.data;
            console.error('Raw entities response:', rawEntities);
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

            // Step 2: Fetch workflow config
            const workflowResponse = await axios.get(
                `${apiBase}/workflows/${workflowId}/config`,
                { headers, timeout }
            );

            const nodes = workflowResponse.data.nodes || [];
            const edgesFromConfig = workflowResponse.data.edges || [];

            // Step 3: Check if trigger block already exists for this entity
            const existingTrigger = nodes.find((b: any) =>
                b.type === 'trigger' &&
                b.entity_id === entity_id
            );

            if (existingTrigger) {
                // Return existing trigger
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            trigger_block_id: existingTrigger.id,
                            trigger_block: existingTrigger,
                            was_created: false
                        }, null, 2)
                    }],
                    structuredContent: {
                        trigger_block_id: existingTrigger.id,
                        trigger_block: existingTrigger,
                        was_created: false
                    }
                };
            }

            // Step 4: Construct new trigger block
            const triggerId = `wtrig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const blockId = `wblock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

            const newTriggerBlock = {
                id: blockId,
                type: 'trigger',
                workflow_id: workflowId,
                name: 'Row Created',
                entity_id: entity_id,
                transform_id: null,
                row_id: null,
                description: null,
                position: {
                    x: position_x ?? 300,
                    y: position_y ?? 50
                },
                trigger: {
                    id: triggerId,
                    event_name: "row_created",
                    entity_id: entity_id
                }
            };

            // Step 5: PATCH workflow
            const requestBody = {
                blocks: [newTriggerBlock],
                deleted_block_ids: [],
                edges: edgesFromConfig.map((e: any) => ({
                    source: e.source,
                    target: e.target
                }))
            };

            const response = await axios.patch(
                `${apiBase}/workflows/${workflowId}/blocks`,
                requestBody,
                { headers, timeout }
            );


            // Step 6: Return result
            const result = {
                trigger_block_id: blockId,
                trigger_block: newTriggerBlock,
                was_created: true
            };

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }],
                structuredContent: result
            };
        } catch (error: any) {
            const errorMessage = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : error.message;

            return {
                content: [{
                    type: 'text',
                    text: `Error creating row created trigger: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

server.registerTool(
    'create_run_transform_block',
    {
        title: 'Create Run Transform Block',
        description: 'Create a new run_transform action block in a Trellis workflow and wire it after an existing block',
        inputSchema: {
            trigger_block_id: z.string().describe('ID of an existing block in the workflow to connect from'),
            transform_name: z.string().describe('Human-facing transform name (case-insensitive)'),
            position_x: z.number().optional().describe('X coordinate for the new block (fallback: use trigger block position_x)'),
            position_y: z.number().optional().describe('Y coordinate for the new block (fallback: use trigger block position_y + 150)'),
            asset_reference_block_id: z.string().nullable().optional().describe('If provided, assets_list_reference will be set to "{{<block_id>.asset_ids}}"')
        }
    },
    async ({ trigger_block_id, transform_name, position_x, position_y, asset_reference_block_id }) => {
        const apiKey = process.env.TRELLIS_API_KEY;
        const apiBase = process.env.TRELLIS_API_BASE;
        const workflowId = process.env.WORKFLOW_ID;
        const apiVersion = '2025-03';

        // Validate required env vars
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

            // Step 1: Resolve transform_name → transform_id
            const transformParams = new URLSearchParams();
            transformParams.append('search_term', transform_name);

            const transformsResponse = await axios.get(
                `${apiBase}/transforms?${transformParams.toString()}`,
                { headers, timeout }
            );

            const rawTransforms = transformsResponse.data.data;
            console.error("^_^ ~ rawTransforms:", rawTransforms);

            const transforms = Array.isArray(rawTransforms)
                ? rawTransforms
                : Array.isArray((rawTransforms as any).transforms)
                    ? (rawTransforms as any).transforms
                    : [];

            if (!Array.isArray(transforms)) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: Unexpected transforms response shape: ${JSON.stringify(rawTransforms).slice(0, 500)}`
                    }],
                    isError: true
                };
            }

            const matchingTransforms = transforms.filter((t: any) =>
                t.name?.toLowerCase() === transform_name.toLowerCase()
            );

            if (matchingTransforms.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: No transform found with name "${transform_name}"`
                    }],
                    isError: true
                };
            }

            if (matchingTransforms.length > 1) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: Multiple transforms found with name "${transform_name}"`
                    }],
                    isError: true
                };
            }

            const transform_id = matchingTransforms[0].id;

            // Step 2: Fetch workflow config to read existing nodes and edges
            const workflowResponse = await axios.get(
                `${apiBase}/workflows/${workflowId}/config`,
                { headers, timeout }
            );

            const nodes =
                workflowResponse.data.data?.nodes ||
                workflowResponse.data.nodes ||
                [];
            const edgesFromConfig =
                workflowResponse.data.data?.edges ||
                workflowResponse.data.edges ||
                [];

            // Confirm trigger_block_id exists
            const triggerBlock = nodes.find((b: any) => b.id === trigger_block_id);
            console.error("^_^ ~ triggerBlock:", triggerBlock);


            if (!triggerBlock) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: Block with ID "${trigger_block_id}" not found in workflow`
                    }],
                    isError: true
                };
            }

            // Read position from trigger block
            const baseX = typeof triggerBlock.position_x === 'number' ? triggerBlock.position_x : 0;
            const baseY = typeof triggerBlock.position_y === 'number' ? triggerBlock.position_y : 0;

            const blockX = position_x ?? baseX;
            const blockY = position_y ?? (baseY + 500);

            // Step 3: Construct new run_transform block with a stable, client-generated ID
            const newBlockId = `wblock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const assetsConfigId = `wasset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

            const newRunTransformBlock = {
                id: newBlockId,
                workflow_id: workflowId,
                type: 'action' as const,
                name: 'Run Transform',
                position: {
                    x: blockX,
                    y: blockY
                },
                event_filter_metadata: {},
                action: {
                    name: 'run_transform' as const,
                    transform_id: transform_id,
                    assets_config: {
                        id: assetsConfigId,
                        assets_list: null,
                        assets_list_reference: asset_reference_block_id
                            ? `{{${asset_reference_block_id}.asset_ids}}`
                            : null
                    },
                    asset_source: asset_reference_block_id ? 'reference' as const : 'list' as const
                }
            };

            // Step 5: Build new edge using the temp block ID
            const newEdge = {
                source: trigger_block_id,
                target: newBlockId  // Use temp ID - server will map it
            };

            // Step 6: Single PATCH – send the new block and edge together
            const requestBody = {
                blocks: [newRunTransformBlock],
                deleted_block_ids: [],
                edges: [
                    ...(Array.isArray(edgesFromConfig)
                        ? edgesFromConfig.map((e: any) => ({
                            source: e.source,
                            target: e.target
                        }))
                        : []),
                    newEdge
                ]
            };

            const response = await axios.patch(
                `${apiBase}/workflows/${workflowId}/blocks`,
                requestBody,
                { headers, timeout }
            );
            console.error('[create_run_transform_block] PATCH response:', response.data);

            // Extract the server-generated ID from id_mapping
            const idMapping = response.data.data?.id_mapping || response.data.id_mapping || {};
            const serverGeneratedBlockId = idMapping[newBlockId] || newBlockId;
            console.error('[create_run_transform_block] Server-generated block ID:', serverGeneratedBlockId);

            const result = {
                run_transform_block_id: serverGeneratedBlockId,
                temp_block_id: newBlockId,
                block: newRunTransformBlock,
                was_created: true,
                id_mapping: idMapping
            };

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }],
                structuredContent: result
            };
        } catch (error: any) {
            const errorMessage = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : error.message;

            return {
                content: [{
                    type: 'text',
                    text: `Error creating run transform block: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

server.registerTool(
    'add_create_record_block',
    {
        title: 'Add Create Record Block',
        description: 'Create a new create_record action block after an existing block in a Trellis workflow',
        inputSchema: {
            source_block_id: z.string().describe('ID of an existing block in the workflow to connect from'),
            entity_name: z.string().describe('Human-facing entity name (case-insensitive, e.g. "Referral")'),
            field_mappings: z.record(z.string()).describe('Map of human field names to template expressions (e.g. {"First Name": "{{block_id.output.first_name}}"})'),
            position_x: z.number().optional().describe('X coordinate for the new block (fallback: use source block position_x)'),
            position_y: z.number().optional().describe('Y coordinate for the new block (fallback: use source block position_y + 150)')
        }
    },
    async ({ source_block_id, entity_name, field_mappings, position_x, position_y }) => {
        const apiKey = process.env.TRELLIS_API_KEY;
        const apiBase = process.env.TRELLIS_API_BASE;
        const projectId = process.env.PROJECT_ID;
        const workflowId = process.env.WORKFLOW_ID;
        const apiVersion = '2025-03';

        // Validate required env vars
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

            // Step 1: Resolve entity_name → entity_id
            const entitiesParams = new URLSearchParams();
            entitiesParams.append('project_id', projectId);

            const entitiesResponse = await axios.get(
                `${apiBase}/entities?${entitiesParams.toString()}`,
                { headers, timeout }
            );

            const rawEntities = entitiesResponse.data.data || entitiesResponse.data;
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

            // Step 2: Resolve field names → entity_field_ids
            const fieldsResponse = await axios.get(
                `${apiBase}/entities/${entity_id}/fields`,
                { headers, timeout }
            );

            const rawFields = fieldsResponse.data.data || fieldsResponse.data;
            const fields = Array.isArray(rawFields)
                ? rawFields
                : Array.isArray((rawFields as any).fields)
                    ? (rawFields as any).fields
                    : [];

            if (!Array.isArray(fields)) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: Unexpected fields response shape: ${JSON.stringify(rawFields).slice(0, 500)}`
                    }],
                    isError: true
                };
            }

            // Build mapping from human field names to entity_field_ids
            const fieldIdMapping: Record<string, string> = {};
            const missingFields: string[] = [];

            for (const humanFieldName of Object.keys(field_mappings)) {
                const matchingField = fields.find((f: any) =>
                    f.name.toLowerCase() === humanFieldName.toLowerCase()
                );

                if (!matchingField) {
                    missingFields.push(humanFieldName);
                } else {
                    fieldIdMapping[matchingField.id] = field_mappings[humanFieldName];
                }
            }

            if (missingFields.length > 0) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: Fields not found on entity "${entity_name}": ${missingFields.join(', ')}`
                    }],
                    isError: true
                };
            }

            // Step 3: Fetch workflow config
            const workflowResponse = await axios.get(
                `${apiBase}/workflows/${workflowId}/config`,
                { headers, timeout }
            );

            const nodes = workflowResponse.data.data?.nodes || workflowResponse.data.nodes || [];
            const edgesFromConfig = workflowResponse.data.data?.edges || workflowResponse.data.edges || [];

            // Confirm source_block_id exists
            const sourceBlock = nodes.find((b: any) => b.id === source_block_id);

            if (!sourceBlock) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: Block with ID "${source_block_id}" not found in workflow`
                    }],
                    isError: true
                };
            }

            // Read position from source block
            const baseX = typeof sourceBlock.position_x === 'number' ? sourceBlock.position_x : 0;
            const baseY = typeof sourceBlock.position_y === 'number' ? sourceBlock.position_y : 0;

            const blockX = position_x ?? baseX;
            const blockY = position_y ?? (baseY + 150);

            // Step 4: Construct new create_record block
            const newBlockId = `wblock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const mappingConfigId = `map_cfg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

            const newCreateRecordBlock = {
                id: newBlockId,
                workflow_id: workflowId,
                type: 'action' as const,
                name: 'Create Record',
                position: {
                    x: blockX,
                    y: blockY
                },
                event_filter_metadata: {},
                action: {
                    name: 'create_record' as const,
                    entity_id: entity_id,
                    mapping_config: {
                        id: mappingConfigId,
                        mapping: fieldIdMapping,
                        mapping_reference: null
                    }
                }
            };

            // Step 5: Build new edge using the temp block ID
            const newEdge = {
                source: source_block_id,
                target: newBlockId
            };

            // Step 6: Single PATCH – send the new block and edge together
            const requestBody = {
                blocks: [newCreateRecordBlock],
                deleted_block_ids: [],
                edges: [
                    ...(Array.isArray(edgesFromConfig)
                        ? edgesFromConfig.map((e: any) => ({
                            source: e.source,
                            target: e.target
                        }))
                        : []),
                    newEdge
                ]
            };

            const response = await axios.patch(
                `${apiBase}/workflows/${workflowId}/blocks`,
                requestBody,
                { headers, timeout }
            );
            console.error('[add_create_record_block] PATCH response:', response.data);

            // Extract the server-generated ID from id_mapping
            const idMapping = response.data.data?.id_mapping || response.data.id_mapping || {};
            const serverGeneratedBlockId = idMapping[newBlockId] || newBlockId;

            const result = {
                create_record_block_id: serverGeneratedBlockId,
                temp_block_id: newBlockId,
                block: newCreateRecordBlock,
                was_created: true,
                id_mapping: idMapping
            };

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }],
                structuredContent: result
            };
        } catch (error: any) {
            const errorMessage = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : error.message;

            return {
                content: [{
                    type: 'text',
                    text: `Error creating create_record block: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

server.registerTool(
    'create_loop_block_pair',
    {
        title: 'Create Loop Block Pair',
        description: 'Create a Start Loop and End Loop block after an existing block, configured to iterate over a list reference',
        inputSchema: {
            source_block_id: z.string().describe('ID of an existing block in the workflow to connect from'),
            loop_variable: z.string().describe('Name of the loop variable to use inside the loop (e.g. "child_entities", "list")'),
            list_reference: z.string().describe('Template expression that evaluates to a list (e.g. "{{wblock_xxx.asset_ids}}")'),
            loop_type: z.enum(['concurrent', 'sequential']).optional().describe('Loop execution type (default: concurrent)'),
            position_x: z.number().optional().describe('X coordinate for the Start Loop block (fallback: use source block position_x)'),
            position_y: z.number().optional().describe('Y coordinate for the Start Loop block (fallback: use source block position_y + 200)')
        }
    },
    async ({ source_block_id, loop_variable, list_reference, loop_type = 'concurrent', position_x, position_y }) => {
        const apiKey = process.env.TRELLIS_API_KEY;
        const apiBase = process.env.TRELLIS_API_BASE;
        const workflowId = process.env.WORKFLOW_ID;
        const apiVersion = '2025-03';

        // Validate required env vars
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

            // Step 1: Fetch workflow config
            const workflowResponse = await axios.get(
                `${apiBase}/workflows/${workflowId}/config`,
                { headers, timeout }
            );

            const nodes = workflowResponse.data.data?.nodes || workflowResponse.data.nodes || [];
            const edgesFromConfig = workflowResponse.data.data?.edges || workflowResponse.data.edges || [];

            // Confirm source_block_id exists
            const sourceBlock = nodes.find((b: any) => b.id === source_block_id);

            if (!sourceBlock) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: Block with ID "${source_block_id}" not found in workflow`
                    }],
                    isError: true
                };
            }

            // Read position from source block
            const baseX = typeof sourceBlock.position_x === 'number' ? sourceBlock.position_x : 0;
            const baseY = typeof sourceBlock.position_y === 'number' ? sourceBlock.position_y : 0;

            const startLoopX = position_x ?? baseX;
            const startLoopY = position_y ?? (baseY + 200);
            const endLoopX = startLoopX;
            const endLoopY = startLoopY + 150;

            // Step 2: Construct Start Loop block
            const startLoopBlockId = `wblock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const loopConfigId = `loop_cfg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

            const startLoopBlock = {
                id: startLoopBlockId,
                workflow_id: workflowId,
                type: 'action' as const,
                name: 'Start Loop',
                position: {
                    x: startLoopX,
                    y: startLoopY
                },
                event_filter_metadata: {},
                action: {
                    name: 'start_loop' as const,
                    loop_config: {
                        id: loopConfigId,
                        loop_type: loop_type,
                        loop_variable: loop_variable,
                        table_reference: null,
                        list_reference: list_reference
                    }
                }
            };

            // Step 3: Construct End Loop block
            const endLoopBlockId = `wblock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

            const endLoopBlock = {
                id: endLoopBlockId,
                workflow_id: workflowId,
                type: 'action' as const,
                name: 'End Loop',
                position: {
                    x: endLoopX,
                    y: endLoopY
                },
                event_filter_metadata: {},
                action: {
                    name: 'end_loop' as const
                }
            };

            // Step 4: Build edges
            const edgeToStartLoop = {
                source: source_block_id,
                target: startLoopBlockId
            };

            const edgeToEndLoop = {
                source: startLoopBlockId,
                target: endLoopBlockId
            };

            // Step 5: Single PATCH – send both blocks and edges together
            const requestBody = {
                blocks: [startLoopBlock, endLoopBlock],
                deleted_block_ids: [],
                edges: [
                    ...(Array.isArray(edgesFromConfig)
                        ? edgesFromConfig.map((e: any) => ({
                            source: e.source,
                            target: e.target
                        }))
                        : []),
                    edgeToStartLoop,
                    edgeToEndLoop
                ]
            };

            const response = await axios.patch(
                `${apiBase}/workflows/${workflowId}/blocks`,
                requestBody,
                { headers, timeout }
            );
            console.error('[create_loop_block_pair] PATCH response:', response.data);

            // Extract the server-generated IDs from id_mapping
            const idMapping = response.data.data?.id_mapping || response.data.id_mapping || {};
            const serverStartLoopBlockId = idMapping[startLoopBlockId] || startLoopBlockId;
            const serverEndLoopBlockId = idMapping[endLoopBlockId] || endLoopBlockId;

            const result = {
                start_loop_block_id: serverStartLoopBlockId,
                end_loop_block_id: serverEndLoopBlockId,
                temp_start_loop_block_id: startLoopBlockId,
                temp_end_loop_block_id: endLoopBlockId,
                start_loop_block: startLoopBlock,
                end_loop_block: endLoopBlock,
                was_created: true,
                id_mapping: idMapping
            };

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }],
                structuredContent: result
            };
        } catch (error: any) {
            const errorMessage = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : error.message;

            return {
                content: [{
                    type: 'text',
                    text: `Error creating loop block pair: ${errorMessage}`
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
