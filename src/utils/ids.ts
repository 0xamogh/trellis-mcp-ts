export function generateBlockId(): string {
    return `wblock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateTriggerId(): string {
    return `wtrig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateCodeEvalId(): string {
    return `code_eval_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateUpdateRecordId(): string {
    return `update_record_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateConfigId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
