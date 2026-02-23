import fetch from "node-fetch";
import { prisma } from "../../libs/prisma.js";
import { signToken } from "../../libs/jwt.js";

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

  //save in DB
  const profile = await profileRes.json();

  //save in DB
  let oauthAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: "spotify",
        providerUserId: profile.id,
      },
    },
    include: {
      user: true,
    },
  });

  let user;

  if (oauthAccount) {
    user = oauthAccount.user;
  } else {
    user = await prisma.user.create({
      data: {
        email: profile.email ?? null,
      },
    });

    oauthAccount = await prisma.oAuthAccount.create({
      data: {
        provider: "spotify",
        providerUserId: profile.id,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        scope: data.scope,
        userId: user.id,
      },
    });
  }

  const token = signToken({ userId: user.id });
  return { token };
};
