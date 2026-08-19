export declare const ORION_SYSTEM_PROMPT: string;
export declare function generateLocalResponse(question: string, context?: Record<string, unknown>): Promise<string>;
export declare function generateLocalResponseSync(question: string, context?: Record<string, unknown>): string;