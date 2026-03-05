/**
 * Configuration storage utility
 * Stores data in ~/.songjump/config.json
 */
import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".songjump");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const YOUTUBE_FILE = path.join(CONFIG_DIR, "youtube.json");

interface SpotifyAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface Config {
  token?: string; // JWT token for backend
  spotify?: SpotifyAuth;
  apiUrl: string;
  oauthProxyUrl: string;
  user?: {
    id: string;
    email?: string;
    displayName?: string;
  };
}

const DEFAULT_CONFIG: Config = {
  apiUrl: "http://127.0.0.1:4000",
  oauthProxyUrl: "https://oauth-proxy-seven.vercel.app",
};

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig(): Config {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const data = fs.readFileSync(CONFIG_FILE, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config: Config): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getToken(): string | undefined {
  return loadConfig().token;
}

export function setToken(token: string): void {
  const config = loadConfig();
  config.token = token;
  saveConfig(config);
}

export function clearToken(): void {
  const config = loadConfig();
  delete config.token;
  delete config.user;
  saveConfig(config);
}

export function getApiUrl(): string {
  return loadConfig().apiUrl;
}

export function getUser(): Config["user"] {
  return loadConfig().user;
}

export function setUser(user: Config["user"]): void {
  const config = loadConfig();
  config.user = user;
  saveConfig(config);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function clearAll(): void {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

// OAuth Proxy URL
export function getOAuthProxyUrl(): string {
  return loadConfig().oauthProxyUrl;
}

// Spotify token storage
export function getSpotifyAuth(): SpotifyAuth | undefined {
  return loadConfig().spotify;
}

export function setSpotifyAuth(auth: SpotifyAuth): void {
  const config = loadConfig();
  config.spotify = auth;
  saveConfig(config);
}

export function clearSpotifyAuth(): void {
  const config = loadConfig();
  delete config.spotify;
  saveConfig(config);
}

export function isSpotifyTokenExpired(): boolean {
  const auth = getSpotifyAuth();
  if (!auth) return true;
  // Add 60 second buffer
  return Date.now() + 60000 >= auth.expiresAt;
}

// YouTube headers storage
export interface YouTubeHeaders {
  Authorization: string;
  Cookie: string;
  "X-Origin": string;
}

export function getYouTubeHeaders(): YouTubeHeaders | null {
  ensureConfigDir();
  if (!fs.existsSync(YOUTUBE_FILE)) {
    return null;
  }
  try {
    const data = fs.readFileSync(YOUTUBE_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setYouTubeHeaders(headers: YouTubeHeaders): void {
  ensureConfigDir();
  fs.writeFileSync(YOUTUBE_FILE, JSON.stringify(headers, null, 2));
}

export function clearYouTubeHeaders(): void {
  if (fs.existsSync(YOUTUBE_FILE)) {
    fs.unlinkSync(YOUTUBE_FILE);
  }
}

export function getYouTubePath(): string {
  return YOUTUBE_FILE;
}
