import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  createJob,
  listJobs,
  getJob,
  startJob,
} from "./transfer.controller.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/transfer - Create new transfer job
router.post("/", createJob);

// GET /api/transfer - List user's transfer jobs
router.get("/", listJobs);

// GET /api/transfer/:jobId - Get job details
router.get("/:jobId", getJob);

// POST /api/transfer/:jobId/start - Start processing job
router.post("/:jobId/start", startJob);

export default router;
