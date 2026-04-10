export interface SessionValidationResult {
    valid: boolean;
    userId?: string;
    error?: string;
}
/**
 * Validates game auth tokens that were signed by the website.
 * Token format: base64(userId:expiresAt:signature)
 * This validates tokens locally without needing an HTTP call.
 */
export declare class SessionValidator {
    private static instance;
    static getInstance(): SessionValidator;
    /**
     * Validate a game auth token
     * The token is a base64 encoded string containing userId:expiresAt:signature
     */
    validateGameAuthToken(token: string): SessionValidationResult;
}
