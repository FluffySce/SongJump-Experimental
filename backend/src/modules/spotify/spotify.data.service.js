import fetch from "node-fetch";
import { prisma } from "../../libs/prisma.js";
import { mapPlaylist, mapTrack } from "./spotify.mapper.js";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

const refreshAccessToken = async (account) => {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        ).toString("base64"),
    },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to refresh Spotify token");
  }

  const updated = await prisma.oAuthAccount.update({
    where: { id: account.id },
    data: {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return updated.accessToken;
};

const getValidAccessToken = async (userId) => {
  const account = await prisma.oAuthAccount.findFirst({
    where: { userId, provider: "spotify" },
  });

  if (!account) {
    throw new Error("Spotify account not linked");
  }

  // Add 60 second buffer to avoid edge cases
  const bufferMs = 60 * 1000;
  if (Date.now() + bufferMs >= account.expiresAt.getTime()) {
    return await refreshAccessToken(account);
  }

  return account.accessToken;
};

export const getUserPlaylists = async (userId) => {
  let url = `${SPOTIFY_API_BASE}/me/playlists?limit=50`;
  const allPlaylists = [];

  while (url) {
    const accessToken = await getValidAccessToken(userId);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch playlists");
    }

    const data = await response.json();

    allPlaylists.push(...data.items);
    url = data.next;
  }

  return allPlaylists.map(mapPlaylist);
};

export const getPlaylistTracks = async (userId, playlistId) => {
  let url = `${SPOTIFY_API_BASE}/playlists/${playlistId}/items?limit=50`;
  const allItems = [];

  while (url) {
    const accessToken = await getValidAccessToken(userId);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch tracks");
    }

    const data = await response.json();

    allItems.push(...data.items);
    url = data.next;
  }

  return allItems.map(mapTrack).filter(Boolean);
};
