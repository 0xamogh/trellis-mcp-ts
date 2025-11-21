export function parseEntitiesResponse(rawData: any): any[] {
    const entities = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as any).entities)
            ? (rawData as any).entities
            : [];

    if (!Array.isArray(entities)) {
        throw new Error(`Unexpected entities response shape: ${JSON.stringify(rawData).slice(0, 500)}`);
    }

    return entities;
}

export function parseFieldsResponse(rawData: any): any[] {
    const fields = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as any).fields)
            ? (rawData as any).fields
            : [];

    if (!Array.isArray(fields)) {
        throw new Error(`Unexpected fields response shape: ${JSON.stringify(rawData).slice(0, 500)}`);
    }

    return fields;
}

export function parseTransformsResponse(rawData: any): any[] {
    const transforms = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as any).transforms)
            ? (rawData as any).transforms
            : [];

    if (!Array.isArray(transforms)) {
        throw new Error(`Unexpected transforms response shape: ${JSON.stringify(rawData).slice(0, 500)}`);
    }

    return transforms;
}

export function resolveEntityByName(entities: any[], entityName: string): { id: string } {
    const matching = entities.filter((e: any) =>
        e.name.toLowerCase() === entityName.toLowerCase()
    );

    if (matching.length === 0) {
        throw new Error(`No entity found with name "${entityName}"`);
    }

    if (matching.length > 1) {
        throw new Error(`Multiple entities found with name "${entityName}"`);
    }

    return matching[0];
}

export function resolveFieldByName(fields: any[], fieldName: string, entityName: string): { id: string } {
    const matching = fields.filter((f: any) =>
        f.name.toLowerCase() === fieldName.toLowerCase()
    );

    if (matching.length === 0) {
        throw new Error(`No field found with name "${fieldName}" on entity "${entityName}"`);
    }

    if (matching.length > 1) {
        throw new Error(`Multiple fields found with name "${fieldName}" on entity "${entityName}"`);
    }

    return matching[0];
}

export function resolveTransformByName(transforms: any[], transformName: string): { id: string } {
    const matching = transforms.filter((t: any) =>
        t.name?.toLowerCase() === transformName.toLowerCase()
    );

    if (matching.length === 0) {
        throw new Error(`No transform found with name "${transformName}"`);
    }

    if (matching.length > 1) {
        throw new Error(`Multiple transforms found with name "${transformName}"`);
    }

    return matching[0];
}
