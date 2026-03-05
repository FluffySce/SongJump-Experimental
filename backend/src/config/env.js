import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 4000,
  jwtSecret:
    process.env.JWT_SECRET || "songjump-dev-secret-change-in-production",
  ytmusicServiceUrl: process.env.YTMUSIC_SERVICE_URL || "http://localhost:8000",
  oauthProxyUrl:
    process.env.OAUTH_PROXY_URL || "https://songjump-auth.vercel.app",
};
