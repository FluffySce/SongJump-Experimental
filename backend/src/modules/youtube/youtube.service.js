//youtube.service.js
import { prisma } from "../../libs/prisma.js";

/**
 * Custom error for YouTube service operations
 */
export class YouTubeServiceError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "YouTubeServiceError";
  }
}

/**
 * Store YouTube Music browser auth headers for a user.
 * Uses OAuthAccount table with provider='google'.
 *
 * The browser headers are stored in the accessToken field as JSON string.
 * refreshToken and expiresAt are set to placeholder values since
 * browser auth doesn't use OAuth refresh flow.
 */
export const saveAuthHeaders = async (userId, authHeaders) => {
  if (!authHeaders || typeof authHeaders !== "string") {
    throw new YouTubeServiceError("Invalid auth headers format", 400);
  }

  // Validate it's valid JSON
  try {
    JSON.parse(authHeaders);
  } catch {
    throw new YouTubeServiceError("Auth headers must be valid JSON", 400);
  }

  // Check for existing Google OAuth account
  const existing = await prisma.oAuthAccount.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (existing) {
    // Update existing
    return prisma.oAuthAccount.update({
      where: { id: existing.id },
      data: {
        accessToken: authHeaders,
        updatedAt: new Date(),
      },
    });
  }

  // Create new - use placeholder values for browser auth
  return prisma.oAuthAccount.create({
    data: {
      provider: "google",
      providerUserId: `ytmusic_${userId}`, // Placeholder since we don't have YT user ID
      accessToken: authHeaders,
      refreshToken: "browser_auth", // Placeholder
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year placeholder
      userId,
    },
  });
};

/**
 * Get YouTube Music auth headers for a user.
 */
export const getAuthHeaders = async (userId) => {
  const account = await prisma.oAuthAccount.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (!account) {
    return null;
  }

  return account.accessToken;
};

/**
 * Check if user has YouTube Music auth configured.
 */
export const hasYouTubeAuth = async (userId) => {
  const account = await prisma.oAuthAccount.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  return !!account;
};

/**
 * Remove YouTube Music auth for a user.
 */
export const removeAuth = async (userId) => {
  const account = await prisma.oAuthAccount.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (!account) {
    throw new YouTubeServiceError("No YouTube Music auth found", 404);
  }

  await prisma.oAuthAccount.delete({
    where: { id: account.id },
  });

  return true;
};

/**
 * Validate YouTube Music auth by calling Python service.
 */
export const validateAuth = async (userId) => {
  const authHeaders = await getAuthHeaders(userId);

  if (!authHeaders) {
    throw new YouTubeServiceError("No YouTube Music auth found", 404);
  }

  const YTMUSIC_SERVICE_URL =
    process.env.YTMUSIC_SERVICE_URL || "http://localhost:8000";

  try {
    const response = await fetch(`${YTMUSIC_SERVICE_URL}/validate-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ auth_headers: authHeaders }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    throw new YouTubeServiceError(
      `Failed to validate auth: ${error.message}`,
      500,
    );
  }
};
