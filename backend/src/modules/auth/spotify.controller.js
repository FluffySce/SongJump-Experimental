import crypto from "crypto";
export const oauthStart = (provider) => async (req, res) => {
  const codeVerifier = crypto.randomBytes(32).toString("hex");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const cookieName = `pkce_${provider}_verifier`;
  res.cookie(cookieName, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 5 * 60 * 1000, // 5 minutes
  });

  let authUrl;
  if (provider === "spotify") {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: "playlist-read-private playlist-modify-private",
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      state: provider,
      code_challange_method: "S256",
      code_challenge: codeChallenge,
    });
    authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }
  // else if provider === "google" do Google logic
  // else if provider === "appleMusic" etc

  res.redirect(authUrl);
};

export const oauthCallback = (provider) => async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.status(400).json({ error });
  }
  if (!code) {
    return res.status(400).json({ message: "No code recieved" });
  }
  const cookieName = `pkce_${provider}_verifier`; // cookie name will be pkce_spotify_verifier
  const codeVerifier = req.cookies[cookieName];
  if (!codeVerifier) {
    return res.status(400).json({ message: "No code verifier found" });
  }
  res.clearCookie(cookieName);
  // Exchange code and verifier for tokens
  // This logic can be delegated to spotify.service.js
  let token;
  if (provider === "spotify") {
    token = await handleSpotifyCallback({
      code,
      codeVerifier,
    });
  }
  // else if provider === "google" etc
  res.json({ token });
};
