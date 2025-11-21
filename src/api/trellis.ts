import axios from 'axios';

export async function fetchEntities(
    apiBase: string,
    projectId: string,
    headers: any,
    timeout: number,
    params?: {
        entity_id?: string;
        primary_only?: boolean;
        exclude_playground?: boolean;
        limit?: number;
        offset?: number;
        order_by?: string;
        order?: 'asc' | 'desc';
    }
) {
    const queryParams = new URLSearchParams();
    queryParams.append('project_id', projectId);

    if (params?.entity_id) queryParams.append('entity_id', params.entity_id);
    if (params?.primary_only !== undefined) queryParams.append('primary_only', params.primary_only.toString());
    if (params?.exclude_playground !== undefined) queryParams.append('exclude_playground', params.exclude_playground.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
    if (params?.order_by) queryParams.append('order_by', params.order_by);
    if (params?.order) queryParams.append('order', params.order);

    return axios.get(
        `${apiBase}/entities?${queryParams.toString()}`,
        { headers, timeout }
    );
}

export async function fetchEntityFields(
    apiBase: string,
    entityId: string,
    headers: any,
    timeout: number,
    entityFieldId?: string
) {
    const params = new URLSearchParams();
    if (entityFieldId) params.append('entity_field_id', entityFieldId);

    const url = `${apiBase}/entities/${entityId}/fields${params.toString() ? '?' + params.toString() : ''}`;

    return axios.get(url, { headers, timeout });
}

export async function fetchTransforms(
    apiBase: string,
    headers: any,
    timeout: number,
    params?: {
        search_term?: string;
        transform_ids?: string[];
        include_transform_params?: boolean;
        limit?: number;
        offset?: number;
        order_by?: 'updated_at' | 'created_at' | 'id';
        order?: 'asc' | 'desc';
    }
) {
    const queryParams = new URLSearchParams();

    if (params?.search_term) queryParams.append('search_term', params.search_term);
    if (params?.transform_ids) params.transform_ids.forEach(id => queryParams.append('transform_ids', id));
    if (params?.include_transform_params !== undefined) queryParams.append('include_transform_params', params.include_transform_params.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
    if (params?.order_by) queryParams.append('order_by', params.order_by);
    if (params?.order) queryParams.append('order', params.order);

    return axios.get(
        `${apiBase}/transforms?${queryParams.toString()}`,
        { headers, timeout }
    );
}

export async function fetchWorkflowConfig(
    apiBase: string,
    workflowId: string,
    headers: any,
    timeout: number
) {
    return axios.get(
        `${apiBase}/workflows/${workflowId}/config`,
        { headers, timeout }
    );
}

export async function patchWorkflowBlocks(
    apiBase: string,
    workflowId: string,
    body: {
        blocks: any[];
        deleted_block_ids: string[];
        edges: Array<{ source: string; target: string }>;
    },
    headers: any,
    timeout: number
) {
    return axios.patch(
        `${apiBase}/workflows/${workflowId}/blocks`,
        body,
        { headers, timeout }
    );
}

export async function createEntity(
    apiBase: string,
    body: {
        name: string;
        entity_type: string;
        project_id: string;
    },
    headers: any,
    timeout: number
) {
    return axios.post(
        `${apiBase}/v1/entities`,
        body,
        { headers, timeout }
    );
}
