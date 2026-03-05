import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const signToken = (payload) => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: "7d", // Extended for CLI convenience
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};
