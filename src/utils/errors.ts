export function createErrorResponse(message: string) {
    return {
        content: [{
            type: 'text' as const,
            text: `Error: ${message}`
        }],
        isError: true as const
    };
}
