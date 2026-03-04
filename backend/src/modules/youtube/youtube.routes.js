//youtube.routes.js
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  saveAuth,
  getAuthStatus,
  removeAuth,
  validateAuth,
} from "./youtube.controller.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/youtube/auth - Save browser auth headers
router.post("/auth", saveAuth);

// GET /api/youtube/auth/status - Check auth status
router.get("/auth/status", getAuthStatus);

// DELETE /api/youtube/auth - Remove auth
router.delete("/auth", removeAuth);

// POST /api/youtube/auth/validate - Test if auth is valid
router.post("/auth/validate", validateAuth);

export default router;
