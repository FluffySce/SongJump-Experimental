//youtube.controller.js
import * as youtubeService from "./youtube.service.js";
import { YouTubeServiceError } from "./youtube.service.js";

/**
 * Maps errors to HTTP responses.
 */
const handleError = (res, error) => {
  if (error instanceof YouTubeServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  }

  console.error("Unexpected error:", error);
  return res.status(500).json({
    success: false,
    error: "Internal server error",
  });
};

/**
 * POST /api/youtube/auth
 * Save YouTube Music browser auth headers.
 *
 * Request body:
 * {
 *   authHeaders: string (JSON of browser request headers)
 * }
 */
export const saveAuth = async (req, res) => {
  try {
    const { authHeaders } = req.body;

    if (!authHeaders) {
      return res.status(400).json({
        success: false,
        error: "authHeaders is required",
      });
    }

    await youtubeService.saveAuthHeaders(req.user.id, authHeaders);

    res.json({
      success: true,
      message: "YouTube Music authentication saved",
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * GET /api/youtube/auth/status
 * Check if user has YouTube Music auth configured.
 */
export const getAuthStatus = async (req, res) => {
  try {
    const hasAuth = await youtubeService.hasYouTubeAuth(req.user.id);

    res.json({
      success: true,
      authenticated: hasAuth,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * DELETE /api/youtube/auth
 * Remove YouTube Music auth for current user.
 */
export const removeAuth = async (req, res) => {
  try {
    await youtubeService.removeAuth(req.user.id);

    res.json({
      success: true,
      message: "YouTube Music authentication removed",
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * POST /api/youtube/auth/validate
 * Test if saved auth headers are still valid.
 */
export const validateAuth = async (req, res) => {
  try {
    const result = await youtubeService.validateAuth(req.user.id);

    res.json({
      success: true,
      valid: result.valid,
      message: result.message,
    });
  } catch (error) {
    handleError(res, error);
  }
};
