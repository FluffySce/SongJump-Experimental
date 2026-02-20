import fetch from "node-fetch";
import { prisma } from "../../libs/prisma";
import { signToken } from "../../libs/jwt";
export const handleSpotifyCallback = async ({ code, codeVerifier }) => {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    code_verifier: codeVerifier,
  });
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Spotify token error");
  const { access_token, refresh_token, expires_in } = data;
  const profileRes = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  const profile = await response.json;

  //save in DB
  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: {},
    create: {
      email: profile.email,
    },
  });
  await prisma.oAuthAccount.upsert({
    where: {
      provider_providerUserId: {
        provider: "spotify",
        providerUserId: profile.id,
      },
    },
    update: {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    },
    create: {
      provider: "spotify",
      providerUserId: profile.id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      scope: data.scope,
      userId: user.id,
    },
  });
  const token = signToken({ userId: user.id });
  return { token };
};
