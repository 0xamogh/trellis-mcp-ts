export function extractResponseData(response: any, dataKey?: string): any {
    if (dataKey) {
        return response.data.data?.[dataKey] || response.data[dataKey] || response.data.data || response.data;
    }
    return response.data.data || response.data;
}

export function normalizeEdges(edges: any[]): Array<{ source: string; target: string }> {
    if (!Array.isArray(edges)) return [];
    return edges.map((e: any) => ({
        source: e.source,
        target: e.target
    }));
}

export function extractIdMapping(response: any): Record<string, string> {
    return response.data.data?.id_mapping || response.data.id_mapping || {};
}
