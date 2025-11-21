import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { fetchEntities, fetchWorkflowConfig, patchWorkflowBlocks } from '../api/trellis.js';
import { parseEntitiesResponse, resolveEntityByName } from '../utils/resolvers.js';
import { normalizeEdges, extractIdMapping } from '../utils/response.js';
import { generateBlockId, generateConfigId } from '../utils/ids.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerRenameAssetsForRow(server: McpServer) {
    server.registerTool(
        'rename_assets_for_row',
        {
            title: 'Rename Assets For Row',
            description: 'Fetch all assets for the row ({{event.row_id}}), loop over them, and rename them using a template string',
            inputSchema: {
                source_block_id: z.string().describe('ID of an existing block in the workflow to connect from'),
                entity_name: z.string().describe('Human-facing entity name (e.g. "Referral")'),
                name_template: z.string().describe('Template string for new asset name (e.g. "{{loop.item.name}}_processed")'),
                position_x: z.number().optional().describe('X coordinate for the flow (fallback: use source block position_x)'),
                position_y: z.number().optional().describe('Y coordinate for the flow (fallback: use source block position_y + 150)')
            }
        },
        async ({ source_block_id, entity_name, name_template, position_x, position_y }) => {
            try {
                const config = getApiConfig({ requireProjectId: true, requireWorkflowId: true });
                const headers = createHeaders(config.apiKey, config.apiVersion);
                // Resolve entity_name → entity_id
                const entitiesResponse = await fetchEntities(
                    config.apiBase,
                    config.projectId,
                    headers,
                    config.timeout
                );

                const rawEntities = entitiesResponse.data.data;
                const entities = parseEntitiesResponse(rawEntities);
                const entity = resolveEntityByName(entities, entity_name);
                const entity_id = entity.id;

                // Load workflow, find source_block_id, compute positions
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

                const baseX = typeof sourceBlock.position_x === 'number' ? sourceBlock.position_x : 0;
                const baseY = typeof sourceBlock.position_y === 'number' ? sourceBlock.position_y : 0;

                const x0 = position_x ?? baseX;
                const y0 = position_y ?? (baseY + 150);

                // Create get_record_assets block
                const getAssetsBlockId = generateBlockId();
                const recordConfigId = generateConfigId('rec_cfg');

                const getAssetsBlock = {
                    id: getAssetsBlockId,
                    workflow_id: config.workflowId,
                    type: 'action' as const,
                    name: 'Get Record Assets',
                    position: {
                        x: x0,
                        y: y0
                    },
                    event_filter_metadata: {},
                    action: {
                        name: 'get_record_assets' as const,
                        entity_id: entity_id,
                        record_reference_config: {
                            id: recordConfigId,
                            record_reference: '{{event.row_id}}',
                            filters: {}
                        },
                        reference_type: 'record_reference' as const
                    }
                };

                // Create Start Loop and End Loop blocks
                const startLoopBlockId = generateBlockId();
                const loopConfigId = generateConfigId('loop_cfg');

                const startLoopBlock = {
                    id: startLoopBlockId,
                    workflow_id: config.workflowId,
                    type: 'action' as const,
                    name: 'Start Loop',
                    position: {
                        x: x0,
                        y: y0 + 150
                    },
                    event_filter_metadata: {},
                    action: {
                        name: 'start_loop' as const,
                        loop_config: {
                            id: loopConfigId,
                            loop_type: 'concurrent',
                            loop_variable: 'list',
                            table_reference: null,
                            list_reference: `{{${getAssetsBlockId}.asset_ids}}`
                        }
                    }
                };

                const endLoopBlockId = generateBlockId();

                const endLoopBlock = {
                    id: endLoopBlockId,
                    workflow_id: config.workflowId,
                    type: 'action' as const,
                    name: 'End Loop',
                    position: {
                        x: x0,
                        y: y0 + 300
                    },
                    event_filter_metadata: {},
                    action: {
                        name: 'end_loop' as const
                    }
                };

                // Create update_asset block
                const updateAssetBlockId = generateBlockId();
                const updateAssetConfigId = generateConfigId('upd_asset_cfg');

                const updateAssetBlock = {
                    id: updateAssetBlockId,
                    workflow_id: config.workflowId,
                    type: 'action' as const,
                    name: 'Rename Asset',
                    position: {
                        x: x0,
                        y: y0 + 225
                    },
                    event_filter_metadata: {},
                    action: {
                        name: 'update_asset' as const,
                        update_asset_config: {
                            id: updateAssetConfigId,
                            asset_id: '{{loop.item}}',
                            new_name: name_template
                        }
                    }
                };

                // Build new edges
                const newEdges = [
                    ...normalizeEdges(edgesFromConfig),
                    { source: source_block_id, target: getAssetsBlockId },
                    { source: getAssetsBlockId, target: startLoopBlockId },
                    { source: startLoopBlockId, target: updateAssetBlockId },
                    { source: updateAssetBlockId, target: endLoopBlockId }
                ];

                // PATCH workflow
                const response = await patchWorkflowBlocks(
                    config.apiBase,
                    config.workflowId,
                    {
                        blocks: [getAssetsBlock, startLoopBlock, endLoopBlock, updateAssetBlock],
                        deleted_block_ids: [],
                        edges: newEdges
                    },
                    headers,
                    config.timeout
                );

                // Extract server-generated IDs
                const idMapping = extractIdMapping(response);

                const result = {
                    get_assets_block_id: idMapping[getAssetsBlockId] || getAssetsBlockId,
                    start_loop_block_id: idMapping[startLoopBlockId] || startLoopBlockId,
                    update_asset_block_id: idMapping[updateAssetBlockId] || updateAssetBlockId,
                    end_loop_block_id: idMapping[endLoopBlockId] || endLoopBlockId,
                    temp_get_assets_block_id: getAssetsBlockId,
                    temp_start_loop_block_id: startLoopBlockId,
                    temp_update_asset_block_id: updateAssetBlockId,
                    temp_end_loop_block_id: endLoopBlockId,
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

                return createErrorResponse(`creating rename assets flow: ${errorMessage}`);
            }
        }
    );
}
