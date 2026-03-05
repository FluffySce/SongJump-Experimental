/**
 * API client for communicating with SongJump backend
 */
import axios, { AxiosError } from "axios";
import { getToken, getApiUrl } from "./config.js";

const api = axios.create({
  timeout: 120000, // 2 minutes for long transfers
});

// Add auth header to all requests
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.baseURL = getApiUrl();
  return config;
});

export class ApiError extends Error {
  statusCode: number;
  data: unknown;

  constructor(message: string, statusCode: number, data: unknown = null) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = "ApiError";
  }
}

function handleError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      error?: string;
      message?: string;
    }>;
    const message =
      axiosError.response?.data?.error ||
      axiosError.response?.data?.message ||
      axiosError.message;
    throw new ApiError(
      message,
      axiosError.response?.status || 500,
      axiosError.response?.data,
    );
  }
  throw error;
}

// Auth endpoints
export async function getMe() {
  try {
    const response = await api.get("/api/auth/me");
    return response.data;
  } catch (error) {
    handleError(error);
  }
}

interface SpotifyAuthPayload {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    id: string;
    email?: string;
    displayName?: string;
  };
}

/**
 * Register Spotify auth with backend to get JWT token
 */
export async function registerSpotifyAuth(auth: SpotifyAuthPayload) {
  try {
    const response = await api.post("/api/auth/spotify/register", {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      expiresAt: auth.expiresAt,
      spotifyUserId: auth.user.id,
      email: auth.user.email,
      displayName: auth.user.displayName,
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
}

// Spotify endpoints
export async function getPlaylists(limit = 20, offset = 0) {
  try {
    const response = await api.get("/api/spotify/playlists", {
      params: { limit, offset },
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
}

// YouTube endpoints
export async function saveYouTubeAuth(authHeaders: string) {
  try {
    const response = await api.post("/api/youtube/auth", { authHeaders });
    return response.data;
  } catch (error) {
    handleError(error);
  }
}

export async function getYouTubeAuthStatus() {
  try {
    const response = await api.get("/api/youtube/auth/status");
    return response.data;
  } catch (error) {
    handleError(error);
  }
}

export async function validateYouTubeAuth() {
  try {
    const response = await api.post("/api/youtube/auth/validate");
    return response.data;
  } catch (error) {
    handleError(error);
  }
}

// Transfer endpoints
export interface TransferResult {
  success: boolean;
  playlistName?: string;
  totalTracks?: number;
  successCount?: number;
  failureCount?: number;
  status?: string;
  tracks?: Array<{
    name: string;
    artist: string;
    status: string;
    youtubeId?: string;
  }>;
  error?: string;
}

export async function quickTransfer(
  spotifyPlaylistId: string,
): Promise<TransferResult> {
  try {
    const response = await api.post("/api/transfer/quick", {
      spotifyPlaylistId,
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
}

export async function getTransferJobs(limit = 20, offset = 0) {
  try {
    const response = await api.get("/api/transfer", {
      params: { limit, offset },
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
}

export async function getTransferJob(jobId: string) {
  try {
    const response = await api.get(`/api/transfer/${jobId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
}
