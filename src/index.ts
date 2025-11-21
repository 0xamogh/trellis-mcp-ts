import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import dotenv from 'dotenv';

// Import tool registration functions
import { registerGetWorkflowConfig } from './tools/get_workflow_config.js';
import { registerGetTransforms } from './tools/get_transforms.js';
import { registerGetEntities } from './tools/get_entities.js';
import { registerGetEntityFields } from './tools/get_entity_fields.js';
import { registerGetAvailableActionTypes } from './tools/get_available_action_types.js';
import { registerCreateEntity } from './tools/create_entity.js';
import { registerUpdateWorkflowBlocks } from './tools/update_workflow_blocks.js';
import { registerAddCodeEvalAfterBlock } from './tools/add_code_eval_after_block.js';
import { registerCreateRowCreatedTriggerForEntity } from './tools/create_row_created_trigger_for_entity.js';
import { registerCreateRunTransformBlock } from './tools/create_run_transform_block.js';
import { registerAddCreateRecordBlock } from './tools/add_create_record_block.js';
import { registerCreateLoopBlockPair } from './tools/create_loop_block_pair.js';
import { registerSyncChildFieldToParent } from './tools/sync_child_field_to_parent.js';
import { registerRenameAssetsForRow } from './tools/rename_assets_for_row.js';
import { registerCreateChildTransformFlow } from './tools/create_child_transform_flow.js';

dotenv.config();

const server = new McpServer({
    name: 'trellis-mcp-server',
    version: '1.0.0'
});

// Register all tools
registerGetWorkflowConfig(server);
registerGetTransforms(server);
registerGetEntities(server);
registerGetEntityFields(server);
registerGetAvailableActionTypes(server);
registerCreateEntity(server);
registerUpdateWorkflowBlocks(server);
registerAddCodeEvalAfterBlock(server);
registerCreateRowCreatedTriggerForEntity(server);
registerCreateRunTransformBlock(server);
registerAddCreateRecordBlock(server);
registerCreateLoopBlockPair(server);
registerSyncChildFieldToParent(server);
registerRenameAssetsForRow(server);
registerCreateChildTransformFlow(server);

// Express server setup
const app = express();
app.use(express.json());


app.all('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on('close', () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || '3000');
app.listen(port, '0.0.0.0', () => {
    console.error(`MCP Server running on http://0.0.0.0:${port}/mcp`);
}).on('error', error => {
    console.error('Server error:', error);
    process.exit(1);
});
