import { Router } from "express";
import { oauthStart, oauthCallback } from "../spotify/spotify.controller.js";
import { registerSpotifyAuth } from "../spotify/spotify.auth.service.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/spotify/start", oauthStart("spotify"));
router.get("/spotify/callback", oauthCallback("spotify"));

/**
 * POST /api/auth/spotify/register
 * Register Spotify auth from CLI (tokens obtained via hosted OAuth proxy)
 */
router.post("/spotify/register", async (req, res) => {
  try {
    const {
      accessToken,
      refreshToken,
      expiresAt,
      spotifyUserId,
      email,
      displayName,
    } = req.body;

    if (!accessToken || !refreshToken || !spotifyUserId) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: accessToken, refreshToken, spotifyUserId",
      });
    }

    const result = await registerSpotifyAuth({
      accessToken,
      refreshToken,
      expiresAt: expiresAt || Date.now() + 3600 * 1000,
      spotifyUserId,
      email,
    });

    res.json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("Spotify registration error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Registration failed",
    });
  }
});

// test route
router.get("/me", authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

//other services etc

export default router;
