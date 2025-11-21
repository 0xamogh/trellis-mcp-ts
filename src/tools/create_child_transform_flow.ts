import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { fetchEntities, fetchEntityFields, fetchTransforms, fetchWorkflowConfig, patchWorkflowBlocks } from '../api/trellis.js';
import { parseEntitiesResponse, parseFieldsResponse, parseTransformsResponse, resolveEntityByName, resolveTransformByName } from '../utils/resolvers.js';
import { normalizeEdges, extractIdMapping } from '../utils/response.js';
import { generateBlockId, generateTriggerId, generateConfigId } from '../utils/ids.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerCreateChildTransformFlow(server: McpServer) {
    server.registerTool(
        'create_child_transform_flow',
        {
            title: 'Create Child Transform Flow',
            description: 'Create loop → run_transform → create_record for each child entity of a parent. Can chain after an existing block or create/find a trigger.',
            inputSchema: {
                parent_entity_name: z.string().describe('Human-facing name of the parent entity (e.g. "Referral")'),
                child_entity_name: z.string().describe('Human-facing name of the child entity (e.g. "Asset")'),
                transform_name: z.string().describe('Human-facing transform name (case-insensitive)'),
                source_block_id: z.string().optional().describe('Optional: ID of existing block to chain from. If not provided, will find or create a trigger for parent entity.'),
                position_x: z.number().optional().describe('X coordinate for the flow (fallback: use source/trigger block position_x)'),
                position_y: z.number().optional().describe('Y coordinate for the flow (fallback: use source/trigger block position_y + 200)')
            }
        },
        async ({ parent_entity_name, child_entity_name, transform_name, source_block_id, position_x, position_y }) => {
            try {
                const config = getApiConfig({ requireProjectId: true, requireWorkflowId: true });
                const headers = createHeaders(config.apiKey, config.apiVersion);
                // Resolve parent_entity_name → parent_entity_id
                const entitiesResponse = await fetchEntities(
                    config.apiBase,
                    config.projectId,
                    headers,
                    config.timeout
                );

                const rawEntities = entitiesResponse.data.data;
                const entities = parseEntitiesResponse(rawEntities);

                const parentEntity = resolveEntityByName(entities, parent_entity_name);
                const parent_entity_id = parentEntity.id;

                // Resolve child_entity_name → child_entity_id
                const childEntity = resolveEntityByName(entities, child_entity_name);
                const child_entity_id = childEntity.id;

                // Resolve transform_name → transform_id
                const transformsResponse = await fetchTransforms(
                    config.apiBase,
                    headers,
                    config.timeout,
                    { search_term: transform_name }
                );

                const rawTransforms = transformsResponse.data.data;
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

                // Determine source block (either provided source_block_id or find/create trigger)
                let sourceBlockId: string;
                let sourceBlock: any;
                let parentTriggerBlock: any = null;
                let shouldCreateTrigger = false;

                if (source_block_id) {
                    // Use provided source block
                    sourceBlock = nodes.find((b: any) => b.id === source_block_id);
                    if (!sourceBlock) {
                        return createErrorResponse(`Block with ID "${source_block_id}" not found in workflow`);
                    }
                    sourceBlockId = source_block_id;
                } else {
                    // Find or create parent row_created trigger
                    parentTriggerBlock = nodes.find((b: any) =>
                        b.type === 'trigger' &&
                        b.entity_id === parent_entity_id
                    );

                    if (!parentTriggerBlock) {
                        // Create new trigger block
                        const triggerId = generateTriggerId();
                        const blockId = generateBlockId();

                        parentTriggerBlock = {
                            id: blockId,
                            type: 'trigger',
                            workflow_id: config.workflowId,
                            name: 'Row Created',
                            entity_id: parent_entity_id,
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
                                entity_id: parent_entity_id
                            }
                        };

                        shouldCreateTrigger = true;
                        sourceBlockId = blockId;
                    } else {
                        sourceBlockId = parentTriggerBlock.id;
                    }
                    sourceBlock = parentTriggerBlock;
                }

                // Create loop block pair
                const baseX = typeof sourceBlock.position_x === 'number' ? sourceBlock.position_x : 0;
                const baseY = typeof sourceBlock.position_y === 'number' ? sourceBlock.position_y : 0;

                const startLoopX = position_x ?? baseX;
                const startLoopY = position_y ?? (baseY + 200);
                const endLoopX = startLoopX;
                const endLoopY = startLoopY + 150;

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
                            loop_type: 'concurrent',
                            loop_variable: 'list',
                            table_reference: null,
                            list_reference: `{{${sourceBlockId}.children.${child_entity_id}}}`
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
                        x: endLoopX,
                        y: endLoopY
                    },
                    event_filter_metadata: {},
                    action: {
                        name: 'end_loop' as const
                    }
                };

                // Create run_transform block
                const runTransformBlockId = generateBlockId();
                const assetsConfigId = generateConfigId('wasset');

                const runTransformBlock = {
                    id: runTransformBlockId,
                    workflow_id: config.workflowId,
                    type: 'action' as const,
                    name: 'Run Transform',
                    position: {
                        x: startLoopX,
                        y: startLoopY + 75
                    },
                    event_filter_metadata: {},
                    action: {
                        name: 'run_transform' as const,
                        transform_id: transform_id,
                        assets_config: {
                            id: assetsConfigId,
                            assets_list: null,
                            assets_list_reference: null
                        },
                        asset_source: 'list' as const
                    }
                };

                // Get first field of child entity for create_record mapping
                const fieldsResponse = await fetchEntityFields(
                    config.apiBase,
                    child_entity_id,
                    headers,
                    config.timeout
                );

                const rawFields = fieldsResponse.data.data || fieldsResponse.data;
                const fields = parseFieldsResponse(rawFields);

                if (fields.length === 0) {
                    return createErrorResponse(`No fields found for child entity "${child_entity_name}"`);
                }

                const firstFieldId = fields[0].id;

                // Create create_record block
                const createRecordBlockId = generateBlockId();
                const mappingConfigId = generateConfigId('map_cfg');

                const createRecordBlock = {
                    id: createRecordBlockId,
                    workflow_id: config.workflowId,
                    type: 'action' as const,
                    name: 'Create Record',
                    position: {
                        x: startLoopX,
                        y: startLoopY + 100
                    },
                    event_filter_metadata: {},
                    action: {
                        name: 'create_record' as const,
                        entity_id: child_entity_id,
                        mapping_config: {
                            id: mappingConfigId,
                            mapping: {
                                [firstFieldId]: `{{${runTransformBlockId}.output}}`
                            },
                            mapping_reference: null
                        }
                    }
                };

                // Build all edges
                const newEdges = [
                    ...normalizeEdges(edgesFromConfig),
                    { source: sourceBlockId, target: startLoopBlockId },
                    { source: startLoopBlockId, target: runTransformBlockId },
                    { source: runTransformBlockId, target: createRecordBlockId },
                    { source: startLoopBlockId, target: endLoopBlockId }
                ];

                // PATCH all blocks
                const blocksToCreate = shouldCreateTrigger
                    ? [parentTriggerBlock, startLoopBlock, endLoopBlock, runTransformBlock, createRecordBlock]
                    : [startLoopBlock, endLoopBlock, runTransformBlock, createRecordBlock];

                const response = await patchWorkflowBlocks(
                    config.apiBase,
                    config.workflowId,
                    {
                        blocks: blocksToCreate,
                        deleted_block_ids: [],
                        edges: newEdges
                    },
                    headers,
                    config.timeout
                );

                // Extract server-generated IDs
                const idMapping = extractIdMapping(response);

                const result = {
                    source_block_id: idMapping[sourceBlockId] || sourceBlockId,
                    start_loop_block_id: idMapping[startLoopBlockId] || startLoopBlockId,
                    run_transform_block_id: idMapping[runTransformBlockId] || runTransformBlockId,
                    create_record_block_id: idMapping[createRecordBlockId] || createRecordBlockId,
                    end_loop_block_id: idMapping[endLoopBlockId] || endLoopBlockId,
                    was_trigger_created: shouldCreateTrigger,
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

                return createErrorResponse(`creating child transform flow: ${errorMessage}`);
            }
        }
    );
}
