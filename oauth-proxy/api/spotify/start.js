/**
 * Spotify OAuth Start Endpoint
 * Redirects user to Spotify authorization with PKCE
 */
import crypto from "crypto";

export default function handler(req, res) {
  const { cli_callback } = req.query;

  if (!cli_callback) {
    return res.status(400).json({ error: "cli_callback is required" });
  }

  // Generate PKCE code verifier and challenge
  const codeVerifier = crypto.randomBytes(32).toString("hex");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Store code verifier in cookie for callback
  res.setHeader(
    "Set-Cookie",
    `pkce_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`,
  );

  // Store CLI callback in cookie
  res.setHeader("Set-Cookie", [
    `pkce_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`,
    `cli_callback=${encodeURIComponent(cli_callback)}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`,
  ]);

  // Build Spotify authorization URL
  const scope = [
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-private",
    "playlist-modify-public",
  ].join(" ");

  // Use fixed production URL for redirect_uri (must match Spotify Dashboard)
  const baseUrl =
    process.env.OAUTH_BASE_URL || "https://oauth-proxy-seven.vercel.app";

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: `${baseUrl}/api/spotify/callback`,
    scope,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  res.redirect(authUrl);
}
