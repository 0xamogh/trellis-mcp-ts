import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { fetchEntities, fetchWorkflowConfig, patchWorkflowBlocks } from '../api/trellis.js';
import { parseEntitiesResponse, resolveEntityByName } from '../utils/resolvers.js';
import { normalizeEdges } from '../utils/response.js';
import { generateBlockId, generateTriggerId } from '../utils/ids.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerCreateRowCreatedTriggerForEntity(server: McpServer) {
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
            try {
                const config = getApiConfig({ requireProjectId: true, requireWorkflowId: true });
                const headers = createHeaders(config.apiKey, config.apiVersion);
                // Resolve entity_id
                const entitiesResponse = await fetchEntities(
                    config.apiBase,
                    config.projectId,
                    headers,
                    config.timeout
                );

                const rawEntities = entitiesResponse.data.data;
                console.error('Raw entities response:', rawEntities);
                const entities = parseEntitiesResponse(rawEntities);
                const entity = resolveEntityByName(entities, entity_name);
                const entity_id = entity.id;

                // Fetch workflow config
                const workflowResponse = await fetchWorkflowConfig(
                    config.apiBase,
                    config.workflowId,
                    headers,
                    config.timeout
                );

                const nodes = workflowResponse.data.nodes || [];
                const edgesFromConfig = workflowResponse.data.edges || [];

                // Check if trigger block already exists
                const existingTrigger = nodes.find((b: any) =>
                    b.type === 'trigger' &&
                    b.entity_id === entity_id
                );

                if (existingTrigger) {
                    return {
                        content: [{
                            type: 'text' as const,
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

                // Construct new trigger block
                const triggerId = generateTriggerId();
                const blockId = generateBlockId();

                const newTriggerBlock = {
                    id: blockId,
                    type: 'trigger',
                    workflow_id: config.workflowId,
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

                // PATCH workflow
                await patchWorkflowBlocks(
                    config.apiBase,
                    config.workflowId,
                    {
                        blocks: [newTriggerBlock],
                        deleted_block_ids: [],
                        edges: normalizeEdges(edgesFromConfig)
                    },
                    headers,
                    config.timeout
                );

                const result = {
                    trigger_block_id: blockId,
                    trigger_block: newTriggerBlock,
                    was_created: true
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

                return createErrorResponse(`creating row created trigger: ${errorMessage}`);
            }
        }
    );
}
