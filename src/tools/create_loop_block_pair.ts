import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { fetchWorkflowConfig, patchWorkflowBlocks } from '../api/trellis.js';
import { normalizeEdges, extractIdMapping } from '../utils/response.js';
import { generateBlockId, generateConfigId } from '../utils/ids.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerCreateLoopBlockPair(server: McpServer) {
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
            try {
                const config = getApiConfig({ requireWorkflowId: true });
                const headers = createHeaders(config.apiKey, config.apiVersion);
                // Fetch workflow config
                const workflowResponse = await fetchWorkflowConfig(
                    config.apiBase,
                    config.workflowId,
                    headers,
                    config.timeout
                );

                const nodes = workflowResponse.data.data?.nodes || workflowResponse.data.nodes || [];
                const edgesFromConfig = workflowResponse.data.data?.edges || workflowResponse.data.edges || [];

                const sourceBlock = nodes.find((b: any) => b.id === source_block_id);

                if (!sourceBlock) {
                    return createErrorResponse(`Block with ID "${source_block_id}" not found in workflow`);
                }

                // Read position from source block
                const baseX = typeof sourceBlock.position_x === 'number' ? sourceBlock.position_x : 0;
                const baseY = typeof sourceBlock.position_y === 'number' ? sourceBlock.position_y : 0;

                const startLoopX = position_x ?? baseX;
                const startLoopY = position_y ?? (baseY + 200);
                const endLoopX = startLoopX;
                const endLoopY = startLoopY + 150;

                // Construct Start Loop block
                const startLoopBlockId = generateBlockId();
                const loopConfigId = generateConfigId('loop_cfg');

                const startLoopBlock = {
                    id: startLoopBlockId,
                    workflow_id: config.workflowId,
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

                // Construct End Loop block
                const endLoopBlockId = generateBlockId();

                const endLoopBlock = {
                    id: endLoopBlockId,
                    workflow_id: config.workflowId,
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

                // Build edges
                const edgeToStartLoop = {
                    source: source_block_id,
                    target: startLoopBlockId
                };

                const edgeToEndLoop = {
                    source: startLoopBlockId,
                    target: endLoopBlockId
                };

                // PATCH workflow
                const response = await patchWorkflowBlocks(
                    config.apiBase,
                    config.workflowId,
                    {
                        blocks: [startLoopBlock, endLoopBlock],
                        deleted_block_ids: [],
                        edges: [
                            ...normalizeEdges(edgesFromConfig),
                            edgeToStartLoop,
                            edgeToEndLoop
                        ]
                    },
                    headers,
                    config.timeout
                );
                console.error('[create_loop_block_pair] PATCH response:', response.data);

                // Extract server-generated IDs
                const idMapping = extractIdMapping(response);
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
                        type: 'text' as const,
                        text: JSON.stringify(result, null, 2)
                    }],
                    structuredContent: result
                };
            } catch (error: any) {
                const errorMessage = error.response?.data
                    ? JSON.stringify(error.response.data, null, 2)
                    : error.message;

                return createErrorResponse(`creating loop block pair: ${errorMessage}`);
            }
        }
    );
}
