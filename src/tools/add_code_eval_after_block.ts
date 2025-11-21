import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { fetchEntities, fetchEntityFields, fetchWorkflowConfig, patchWorkflowBlocks } from '../api/trellis.js';
import { parseEntitiesResponse, parseFieldsResponse, resolveEntityByName, resolveFieldByName } from '../utils/resolvers.js';
import { normalizeEdges } from '../utils/response.js';
import { generateCodeEvalId, generateUpdateRecordId, generateConfigId } from '../utils/ids.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerAddCodeEvalAfterBlock(server: McpServer) {
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
            try {
                const config = getApiConfig({ requireProjectId: true, requireWorkflowId: true });
                const headers = createHeaders(config.apiKey, config.apiVersion);
                // Resolve entity_id from entity_name
                const entitiesResponse = await fetchEntities(
                    config.apiBase,
                    config.projectId,
                    headers,
                    config.timeout
                );

                const rawEntities = entitiesResponse.data.data || entitiesResponse.data;
                const entities = parseEntitiesResponse(rawEntities);
                const entity = resolveEntityByName(entities, entity_name);
                const entity_id = entity.id;

                // Resolve entity_field_id from target_field_name
                const fieldsResponse = await fetchEntityFields(
                    config.apiBase,
                    entity_id,
                    headers,
                    config.timeout
                );

                const rawFields = fieldsResponse.data;
                const fields = parseFieldsResponse(rawFields);
                const field = resolveFieldByName(fields, target_field_name, entity_name);
                const entity_field_id = field.id;

                // Load workflow config
                const workflowResponse = await fetchWorkflowConfig(
                    config.apiBase,
                    config.workflowId,
                    headers,
                    config.timeout
                );

                const nodes = workflowResponse.data.nodes || [];
                const edgesFromConfig = workflowResponse.data.edges || [];

                const afterBlock = nodes.find((b: any) => b.id === after_block_id);

                if (!afterBlock) {
                    return createErrorResponse(`Block with ID "${after_block_id}" not found in workflow`);
                }

                const baseX = typeof afterBlock.position_x === 'number' ? afterBlock.position_x : 0;
                const baseY = typeof afterBlock.position_y === 'number' ? afterBlock.position_y : 0;

                // Build new blocks
                const codeEvalBlockId = generateCodeEvalId();
                const codeEvalConfigId = generateConfigId('code_eval_cfg');
                const recordConfigId = generateConfigId('rec_cfg');
                const mappingConfigId = generateConfigId('map_cfg');
                const updateRecordBlockId = generateUpdateRecordId();

                const codeEvalBlock = {
                    id: codeEvalBlockId,
                    workflow_id: config.workflowId,
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
                    workflow_id: config.workflowId,
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

                // Build new edges
                const edgeA = {
                    source: after_block_id,
                    target: codeEvalBlockId
                };

                const edgeB = {
                    source: codeEvalBlockId,
                    target: updateRecordBlockId
                };

                const newEdges = [
                    ...normalizeEdges(edgesFromConfig),
                    edgeA,
                    edgeB
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

                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }],
                    structuredContent: response.data
                };
            } catch (error: any) {
                const errorMessage = error.response?.data
                    ? JSON.stringify(error.response.data, null, 2)
                    : error.message;

                return createErrorResponse(`adding code eval after block: ${errorMessage}`);
            }
        }
    );
}
