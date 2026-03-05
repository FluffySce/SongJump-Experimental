/**
 * Spotify OAuth Callback Endpoint
 * Exchanges authorization code for tokens and redirects to CLI
 */

export default async function handler(req, res) {
  const { code, error } = req.query;

  // Parse cookies
  const cookies = parseCookies(req.headers.cookie || "");
  const codeVerifier = cookies.pkce_verifier;
  const cliCallback = cookies.cli_callback
    ? decodeURIComponent(cookies.cli_callback)
    : null;

  // Clear cookies
  res.setHeader("Set-Cookie", [
    "pkce_verifier=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/",
    "cli_callback=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/",
  ]);

  if (error) {
    if (cliCallback) {
      return res.redirect(`${cliCallback}?error=${encodeURIComponent(error)}`);
    }
    return res.status(400).json({ error });
  }

  if (!code) {
    const errMsg = "No authorization code received";
    if (cliCallback) {
      return res.redirect(`${cliCallback}?error=${encodeURIComponent(errMsg)}`);
    }
    return res.status(400).json({ error: errMsg });
  }

  if (!codeVerifier) {
    const errMsg = "Missing PKCE verifier - please try again";
    if (cliCallback) {
      return res.redirect(`${cliCallback}?error=${encodeURIComponent(errMsg)}`);
    }
    return res.status(400).json({ error: errMsg });
  }

  try {
    // Exchange code for tokens - use fixed URL (must match start.js and Spotify Dashboard)
    const baseUrl =
      process.env.OAUTH_BASE_URL || "https://oauth-proxy-seven.vercel.app";

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${baseUrl}/api/spotify/callback`,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      code_verifier: codeVerifier,
    });

    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(
        tokenData.error_description ||
          tokenData.error ||
          "Token exchange failed",
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Fetch Spotify user profile
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch Spotify profile");
    }

    const profile = await profileResponse.json();

    // Build response data
    const authData = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      expiresAt: Date.now() + expires_in * 1000,
      user: {
        id: profile.id,
        email: profile.email,
        displayName: profile.display_name,
      },
    };

    // Redirect to CLI with tokens
    if (cliCallback) {
      const encodedData = encodeURIComponent(JSON.stringify(authData));
      return res.redirect(`${cliCallback}?auth=${encodedData}`);
    }

    // Fallback: return JSON
    return res.json({ success: true, ...authData });
  } catch (err) {
    console.error("OAuth callback error:", err);
    const errMsg = err.message || "Authentication failed";

    if (cliCallback) {
      return res.redirect(`${cliCallback}?error=${encodeURIComponent(errMsg)}`);
    }
    return res.status(500).json({ error: errMsg });
  }
}

function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) {
      cookies[name] = rest.join("=");
    }
  });
  return cookies;
}
