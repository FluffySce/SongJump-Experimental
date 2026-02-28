import * as transferService from "./transfer.service.js";
/**
 * POST /api/transfer
 * Creates a new transfer job.
 */
export const createJob = async (req, res) => {
  try {
    const { spotifyPlaylistId, targetProvider } = req.body;
    if (!spotifyPlaylistId) {
      return res.status(400).json({
        success: false,
        error: "spotifyPlaylistId is required",
      });
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
    res.status(400).json({
      success: false,
      error: error.message,
    });
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
    res.status(500).json({
      success: false,
      error: error.message,
    });
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
    const status =
      error.message === "Job not found"
        ? 404
        : error.message === "Unauthorized access to job"
          ? 403
          : 500;

    res.status(status).json({
      success: false,
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        error: "jobId parameter is required",
      });
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
    console.error("Start job error:", error);

    const status =
      error.message === "Job not found"
        ? 404
        : error.message === "Unauthorized access to job"
          ? 403
          : error.message.includes("Cannot start job")
            ? 409
            : 500;

    res.status(status).json({
      success: false,
      error: error.message,
    });
  }
};
