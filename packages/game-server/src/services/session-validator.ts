import crypto from "crypto";
import { GAME_SERVER_API_KEY } from "@/config/env";

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
export class SessionValidator {
  private static instance: SessionValidator;

  static getInstance(): SessionValidator {
    if (!SessionValidator.instance) {
      SessionValidator.instance = new SessionValidator();
    }
    return SessionValidator.instance;
  }

  /**
   * Validate a game auth token
   * The token is a base64 encoded string containing userId:expiresAt:signature
   */
  validateGameAuthToken(token: string): SessionValidationResult {
    if (!token) {
      return { valid: false, error: "No token provided" };
    }

    if (!GAME_SERVER_API_KEY) {
      return { valid: false, error: "Server not configured for authentication" };
    }

    try {
      // Decode the base64 token
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");

      if (parts.length !== 3) {
        return { valid: false, error: "Invalid token format" };
      }

      const [userId, expiresAtStr, signature] = parts;
      const expiresAt = parseInt(expiresAtStr, 10);

      // Check if token has expired
      if (Date.now() > expiresAt) {
        return { valid: false, error: "Token expired" };
      }

      // Verify signature
      const payload = `${userId}:${expiresAtStr}`;
      const expectedSignature = crypto
        .createHmac("sha256", GAME_SERVER_API_KEY)
        .update(payload)
        .digest("hex");

      if (signature !== expectedSignature) {
        return { valid: false, error: "Invalid token signature" };
      }

      return { valid: true, userId };
    } catch (error) {
      console.error("Token validation failed:", error);
      return { valid: false, error: "Failed to validate token" };
    }
  }
}
