//transfer.controller.js
import * as transferService from "./transfer.service.js";
import { TransferError, ValidationError } from "./transfer.service.js";

/**
 * Maps errors to HTTP responses without leaking internals.
 */
const handleError = (res, error) => {
  if (error instanceof TransferError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  }

  console.error("Unexpected error:", error);
  return res.status(500).json({
    success: false,
    error: "Internal server error",
  });
};

/**
 * POST /api/transfer
 * Creates a new transfer job.
 */
export const createJob = async (req, res) => {
  try {
    const { spotifyPlaylistId, targetProvider } = req.body;
    if (!spotifyPlaylistId) {
      throw new ValidationError("spotifyPlaylistId is required");
    }
    const job = await transferService.createTransferJob({
      userId: req.user.id,
      spotifyPlaylistId,
      targetProvider: targetProvider || "google",
    });
    res.status(201).json({
      success: true,
      jobId: job.id,
      status: job.status,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * GET /api/transfer
 * Lists all transfer jobs for the authenticated user.
 */
export const listJobs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const jobs = await transferService.getUserJobs(req.user.id, {
      limit,
      offset,
    });

    res.json({
      success: true,
      jobs,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * GET /api/transfer/:jobId
 * Returns detailed status of a specific job.
 */
export const getJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await transferService.getJobById(jobId, req.user.id);

    res.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        sourcePlaylistId: job.sourcePlaylistId,
        sourcePlaylistName: job.sourcePlaylistName,
        totalTracks: job.totalTracks,
        processedTracks: job.processedTracks,
        successCount: job.successCount,
        failureCount: job.failureCount,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        items: job.items,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * POST /api/transfer/:jobId/start
 * Begins processing the transfer job.
 */
export const startJob = async (req, res) => {
  try {
    const jobId = req.params.jobId;

    if (!jobId) {
      throw new ValidationError("jobId parameter is required");
    }

    const job = await transferService.startTransferJob(jobId, req.user.id);

    res.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        totalTracks: job.totalTracks,
        processedTracks: job.processedTracks,
        successCount: job.successCount,
        failureCount: job.failureCount,
        completedAt: job.completedAt,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};
