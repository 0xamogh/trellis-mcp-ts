export interface ApiConfig {
    apiKey: string;
    apiBase: string;
    projectId: string;
    workflowId: string;
    timeout: number;
    apiVersion: string;
}

export function getApiConfig(options?: { requireProjectId?: boolean; requireWorkflowId?: boolean }): ApiConfig {
    const apiKey = process.env.TRELLIS_API_KEY;
    const apiBase = process.env.TRELLIS_API_BASE;
    const projectId = process.env.PROJECT_ID;
    const workflowId = process.env.WORKFLOW_ID;
    const apiVersion = '2025-03';
    const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30') * 1000;

    if (!apiKey) {
        throw new Error('TRELLIS_API_KEY not found in environment variables');
    }

    if (!apiBase) {
        throw new Error('TRELLIS_API_BASE not found in environment variables');
    }

    if (options?.requireProjectId && !projectId) {
        throw new Error('project_id not provided and PROJECT_ID not found in environment variables');
    }

    if (options?.requireWorkflowId && !workflowId) {
        throw new Error('workflow_id not provided and WORKFLOW_ID not found in environment variables');
    }

    return {
        apiKey,
        apiBase,
        projectId: projectId || '',
        workflowId: workflowId || '',
        timeout,
        apiVersion
    };
}

export function createHeaders(apiKey: string, apiVersion: string) {
    return {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'API-Version': apiVersion,
        'Authorization': apiKey
    };
}
