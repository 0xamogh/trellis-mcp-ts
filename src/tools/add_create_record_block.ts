import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getApiConfig, createHeaders } from '../api/config.js';
import { fetchEntities, fetchEntityFields, fetchWorkflowConfig, patchWorkflowBlocks } from '../api/trellis.js';
import { parseEntitiesResponse, parseFieldsResponse, resolveEntityByName } from '../utils/resolvers.js';
import { normalizeEdges, extractIdMapping } from '../utils/response.js';
import { generateBlockId, generateConfigId } from '../utils/ids.js';
import { createErrorResponse } from '../utils/errors.js';

export function registerAddCreateRecordBlock(server: McpServer) {
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

                const rawEntities = entitiesResponse.data.data || entitiesResponse.data;
                const entities = parseEntitiesResponse(rawEntities);
                const entity = resolveEntityByName(entities, entity_name);
                const entity_id = entity.id;

                // Resolve field names → entity_field_ids
                const fieldsResponse = await fetchEntityFields(
                    config.apiBase,
                    entity_id,
                    headers,
                    config.timeout
                );

                const rawFields = fieldsResponse.data.data || fieldsResponse.data;
                const fields = parseFieldsResponse(rawFields);

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
                    return createErrorResponse(`Fields not found on entity "${entity_name}": ${missingFields.join(', ')}`);
                }

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

                const blockX = position_x ?? baseX;
                const blockY = position_y ?? (baseY + 150);

                // Construct new create_record block
                const newBlockId = generateBlockId();
                const mappingConfigId = generateConfigId('map_cfg');

                const newCreateRecordBlock = {
                    id: newBlockId,
                    workflow_id: config.workflowId,
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

                // Build new edge
                const newEdge = {
                    source: source_block_id,
                    target: newBlockId
                };

                // PATCH workflow
                const response = await patchWorkflowBlocks(
                    config.apiBase,
                    config.workflowId,
                    {
                        blocks: [newCreateRecordBlock],
                        deleted_block_ids: [],
                        edges: [
                            ...normalizeEdges(edgesFromConfig),
                            newEdge
                        ]
                    },
                    headers,
                    config.timeout
                );
                console.error('[add_create_record_block] PATCH response:', response.data);

                // Extract server-generated ID
                const idMapping = extractIdMapping(response);
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
                        type: 'text' as const,
                        text: JSON.stringify(result, null, 2)
                    }],
                    structuredContent: result
                };
            } catch (error: any) {
                const errorMessage = error.response?.data
                    ? JSON.stringify(error.response.data, null, 2)
                    : error.message;

                return createErrorResponse(`creating create_record block: ${errorMessage}`);
            }
        }
    );
}
