import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { fetchEntities, fetchEntityFields, fetchWorkflowConfig, patchWorkflowBlocks } from '../api/trellis.js';
import { parseEntitiesResponse, parseFieldsResponse, resolveEntityByName, resolveFieldByName } from '../utils/resolvers.js';
import { normalizeEdges, extractIdMapping } from '../utils/response.js';
import { generateCodeEvalId, generateUpdateRecordId, generateConfigId } from '../utils/ids.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerSyncChildFieldToParent(server: McpServer) {
    server.registerTool(
        'sync_child_field_to_parent',
        {
            title: 'Sync Child Field To Parent',
            description: 'Fetch first child entity record, extract a field, and update the parent row with that field\'s value',
            inputSchema: {
                source_block_id: z.string().describe('ID of an existing block in the workflow to connect from'),
                parent_entity_name: z.string().describe('Human-facing name of the parent entity (e.g. "Referral")'),
                child_entity_name: z.string().describe('Human-facing name of the child entity (e.g. "Asset")'),
                child_field_name: z.string().describe('Field name on the child entity to extract'),
                parent_field_name: z.string().describe('Field name on the parent entity to update'),
                position_x: z.number().optional().describe('X coordinate for the flow (fallback: use source block position_x)'),
                position_y: z.number().optional().describe('Y coordinate for the flow (fallback: use source block position_y + 150)')
            }
        },
        async ({ source_block_id, parent_entity_name, child_entity_name, child_field_name, parent_field_name, position_x, position_y }) => {
            try {
                const config = getApiConfig({ requireProjectId: true, requireWorkflowId: true });
                const headers = createHeaders(config.apiKey, config.apiVersion);
                // Resolve parent and child entities
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

                const childEntity = resolveEntityByName(entities, child_entity_name);
                const child_entity_id = childEntity.id;

                // Resolve child field
                const childFieldsResponse = await fetchEntityFields(
                    config.apiBase,
                    child_entity_id,
                    headers,
                    config.timeout
                );

                const rawChildFields = childFieldsResponse.data.data || childFieldsResponse.data;
                const childFields = parseFieldsResponse(rawChildFields);
                const childField = resolveFieldByName(childFields, child_field_name, child_entity_name);
                const child_field_id = childField.id;

                // Resolve parent field
                const parentFieldsResponse = await fetchEntityFields(
                    config.apiBase,
                    parent_entity_id,
                    headers,
                    config.timeout
                );

                const rawParentFields = parentFieldsResponse.data.data || parentFieldsResponse.data;
                const parentFields = parseFieldsResponse(rawParentFields);
                const parentField = resolveFieldByName(parentFields, parent_field_name, parent_entity_name);
                const parent_field_id = parentField.id;

                // Load workflow config
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

                // Create code_eval block
                const codeEvalBlockId = generateCodeEvalId();
                const codeEvalConfigId = generateConfigId('code_eval_cfg');

                const codeEvalBlock = {
                    id: codeEvalBlockId,
                    workflow_id: config.workflowId,
                    type: 'action' as const,
                    name: 'Extract Child Field',
                    position: {
                        x: x0,
                        y: y0
                    },
                    event_filter_metadata: {},
                    action: {
                        name: 'eval_code' as const,
                        code_eval_config: {
                            id: codeEvalConfigId,
                            code: `
(() => {
  const list = event.children["${child_entity_id}"] || [];
  const first = list[0] || null;
  return first ? first["${child_field_id}"] : null;
})()
                            `.trim()
                        }
                    }
                };

                // Create update_record block
                const updateRecordBlockId = generateUpdateRecordId();
                const recordConfigId = generateConfigId('rec_cfg');
                const mappingConfigId = generateConfigId('map_cfg');

                const updateRecordBlock = {
                    id: updateRecordBlockId,
                    workflow_id: config.workflowId,
                    type: 'action' as const,
                    name: 'Update Parent From Child',
                    position: {
                        x: x0,
                        y: y0 + 150
                    },
                    event_filter_metadata: {},
                    action: {
                        name: 'update_record' as const,
                        entity_id: parent_entity_id,
                        record_reference_config: {
                            id: recordConfigId,
                            record_reference: '{{event.row_id}}',
                            filters: {}
                        },
                        mapping_config: {
                            id: mappingConfigId,
                            mapping: {
                                [parent_field_id]: `{{${codeEvalBlockId}}}`
                            },
                            mapping_reference: undefined
                        },
                        reference_type: 'record_reference' as const
                    }
                };

                // Build edges
                const newEdges = [
                    ...normalizeEdges(edgesFromConfig),
                    { source: source_block_id, target: codeEvalBlockId },
                    { source: codeEvalBlockId, target: updateRecordBlockId }
                ];

                // PATCH workflow
                const response = await patchWorkflowBlocks(
                    config.apiBase,
                    config.workflowId,
                    {
                        blocks: [codeEvalBlock, updateRecordBlock],
                        deleted_block_ids: [],
                        edges: newEdges
                    },
                    headers,
                    config.timeout
                );

                // Extract server-generated IDs
                const idMapping = extractIdMapping(response);

                const result = {
                    code_eval_block_id: idMapping[codeEvalBlockId] || codeEvalBlockId,
                    update_record_block_id: idMapping[updateRecordBlockId] || updateRecordBlockId,
                    temp_ids: {
                        codeEvalBlockId,
                        updateRecordBlockId
                    },
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

                return createErrorResponse(`syncing child field to parent: ${errorMessage}`);
            }
        }
    );
}
