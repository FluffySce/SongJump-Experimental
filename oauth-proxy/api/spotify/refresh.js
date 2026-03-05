/**
 * Spotify Token Refresh Endpoint
 * Refreshes access token using refresh token
 */

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: "refresh_token is required" });
  }

  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error_description || data.error || "Token refresh failed",
      );
    }

    return res.json({
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refresh_token, // Spotify may return new refresh token
      expiresIn: data.expires_in,
      expiresAt: Date.now() + data.expires_in * 1000,
    });
  } catch (err) {
    console.error("Token refresh error:", err);
    return res
      .status(401)
      .json({ error: err.message || "Token refresh failed" });
  }
}
