import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAvailableActionTypes } from '../constants.js';

export function registerGetAvailableActionTypes(server: McpServer) {
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
}
