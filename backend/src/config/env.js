import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET,
  ytmusicServiceUrl: process.env.YTMUSIC_SERVICE_URL || "http://localhost:8000",
};
