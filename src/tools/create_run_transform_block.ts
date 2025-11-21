import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { fetchTransforms, fetchWorkflowConfig, patchWorkflowBlocks } from '../api/trellis.js';
import { parseTransformsResponse, resolveTransformByName } from '../utils/resolvers.js';
import { normalizeEdges, extractIdMapping } from '../utils/response.js';
import { generateBlockId, generateConfigId } from '../utils/ids.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerCreateRunTransformBlock(server: McpServer) {
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
            try {
                const config = getApiConfig({ requireWorkflowId: true });
                const headers = createHeaders(config.apiKey, config.apiVersion);
                // Resolve transform_name → transform_id
                const transformsResponse = await fetchTransforms(
                    config.apiBase,
                    headers,
                    config.timeout,
                    { search_term: transform_name }
                );

                const rawTransforms = transformsResponse.data.data;
                console.error("^_^ ~ rawTransforms:", rawTransforms);

                const transforms = parseTransformsResponse(rawTransforms);
                const transform = resolveTransformByName(transforms, transform_name);
                const transform_id = transform.id;

                // Fetch workflow config
                const workflowResponse = await fetchWorkflowConfig(
                    config.apiBase,
                    config.workflowId,
                    headers,
                    config.timeout
                );

                const nodes = workflowResponse.data.data?.nodes || workflowResponse.data.nodes || [];
                const edgesFromConfig = workflowResponse.data.data?.edges || workflowResponse.data.edges || [];

                const triggerBlock = nodes.find((b: any) => b.id === trigger_block_id);
                console.error("^_^ ~ triggerBlock:", triggerBlock);

                if (!triggerBlock) {
                    return createErrorResponse(`Block with ID "${trigger_block_id}" not found in workflow`);
                }

                // Read position from trigger block
                const baseX = typeof triggerBlock.position_x === 'number' ? triggerBlock.position_x : 0;
                const baseY = typeof triggerBlock.position_y === 'number' ? triggerBlock.position_y : 0;

                const blockX = position_x ?? baseX;
                const blockY = position_y ?? (baseY + 500);

                // Construct new run_transform block
                const newBlockId = generateBlockId();
                const assetsConfigId = generateConfigId('wasset');

                const newRunTransformBlock = {
                    id: newBlockId,
                    workflow_id: config.workflowId,
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

                // Build new edge
                const newEdge = {
                    source: trigger_block_id,
                    target: newBlockId
                };

                // PATCH workflow
                const response = await patchWorkflowBlocks(
                    config.apiBase,
                    config.workflowId,
                    {
                        blocks: [newRunTransformBlock],
                        deleted_block_ids: [],
                        edges: [
                            ...normalizeEdges(edgesFromConfig),
                            newEdge
                        ]
                    },
                    headers,
                    config.timeout
                );
                console.error('[create_run_transform_block] PATCH response:', response.data);

                // Extract server-generated ID
                const idMapping = extractIdMapping(response);
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
                        type: 'text' as const,
                        text: JSON.stringify(result, null, 2)
                    }],
                    structuredContent: result
                };
            } catch (error: any) {
                const errorMessage = error.response?.data
                    ? JSON.stringify(error.response.data, null, 2)
                    : error.message;

                return createErrorResponse(`creating run transform block: ${errorMessage}`);
            }
        }
    );
}
