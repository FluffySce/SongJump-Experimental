//transfer.service.js
import { prisma } from "../../libs/prisma.js";
import * as spotifyDataService from "../spotify/spotify.data.service.js";

// Custom error classes for proper HTTP status mapping
export class TransferError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "TransferError";
  }
}

export class NotFoundError extends TransferError {
  constructor(message = "Job not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends TransferError {
  constructor(message = "Unauthorized access to job") {
    super(message, 403);
    this.name = "UnauthorizedError";
  }
}

export class ConflictError extends TransferError {
  constructor(message) {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export class ValidationError extends TransferError {
  constructor(message) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

const VALID_TRANSITIONS = {
  PENDING: ["PROCESSING"],
  PROCESSING: ["COMPLETED", "PARTIAL", "FAILED"],
  COMPLETED: [],
  PARTIAL: ["PROCESSING"],
  FAILED: ["PROCESSING"],
};

const PROGRESS_UPDATE_BATCH_SIZE = 10;

/**
 * creates a new transfer job -> pending state
 * doesnt excute the transfer (separate operation)
 */

export const createTransferJob = async ({
  userId,
  spotifyPlaylistId,
  targetProvider = "google",
}) => {
  if (targetProvider !== "google") {
    throw new ValidationError("only YTmusic (google) is supported for now.");
  }

  const job = await prisma.transferJob.create({
    data: {
      userId,
      sourceProvider: "spotify",
      sourcePlaylistId: spotifyPlaylistId,
      targetProvider,
      status: "PENDING",
      totalTracks: 0,
      processedTracks: 0,
      successCount: 0,
      failureCount: 0,
    },
  });
  return job;
};

/**
 * Fetch job by ID
 */
export const getJobById = async (jobId, userId) => {
  const job = await prisma.transferJob.findUnique({
    where: { id: jobId },
    include: {
      items: {
        select: {
          id: true,
          trackName: true,
          artistName: true,
          status: true,
          youtubeMusicId: true,
        },
      },
    },
  });
  if (!job) {
    throw new NotFoundError();
  }
  if (job.userId !== userId) {
    throw new UnauthorizedError();
  }
  return job;
};

/**
 * Returns all jobs for a user with pagination support.
 */
export const getUserJobs = async (userId, { limit = 20, offset = 0 } = {}) => {
  const jobs = await prisma.transferJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    select: {
      id: true,
      sourcePlaylistId: true,
      sourcePlaylistName: true,
      status: true,
      totalTracks: true,
      processedTracks: true,
      successCount: true,
      failureCount: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return jobs;
};

/**
 * Validates and performs a state transition.
 * Throws if the transition is invalid.
 */
/**
 * Validates and performs a state transition with concurrency protection.
 * Uses conditional update to prevent race conditions.
 */
const transitionState = async (jobId, currentStatus, newStatus) => {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];

  if (!allowedTransitions?.includes(newStatus)) {
    throw new ConflictError(
      `Invalid state transition: ${currentStatus} → ${newStatus}`,
    );
  }

  const updateData = { status: newStatus };

  if (newStatus === "COMPLETED" || newStatus === "PARTIAL") {
    updateData.completedAt = new Date();
  }

  // Conditional update: only succeeds if status hasn't changed
  const result = await prisma.transferJob.updateMany({
    where: { id: jobId, status: currentStatus },
    data: updateData,
  });

  if (result.count === 0) {
    throw new ConflictError("Job state changed concurrently. Please retry.");
  }

  return prisma.transferJob.findUnique({ where: { id: jobId } });
};

/**
 * Starts processing a transfer job (synchronous execution).
 */
export const startTransferJob = async (jobId, userId) => {
  const job = await getJobById(jobId, userId);

  if (
    job.status !== "PENDING" &&
    job.status !== "FAILED" &&
    job.status !== "PARTIAL"
  ) {
    throw new ConflictError(`Cannot start job in ${job.status} state`);
  }

  // Transition to PROCESSING with concurrency guard
  await transitionState(job.id, job.status, "PROCESSING");

  try {
    // Fetch tracks from Spotify
    const tracks = await spotifyDataService.getPlaylistTracks(
      userId,
      job.sourcePlaylistId,
    );

    if (tracks.length === 0) {
      // No tracks to process - mark as completed
      await prisma.transferJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          totalTracks: 0,
          completedAt: new Date(),
        },
      });

      return getJobById(job.id, userId);
    }

    // Update total tracks count
    await prisma.transferJob.update({
      where: { id: job.id },
      data: { totalTracks: tracks.length },
    });

    // Process each track with batched progress updates
    let successCount = 0;
    let failureCount = 0;
    const transferItems = [];

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];

      try {
        const matched = await simulateYouTubeMatch(track);

        transferItems.push({
          transferJobId: job.id,
          trackName: track.title,
          artistName: track.artists.join(", "),
          status: matched ? "FOUND" : "NOT_FOUND",
          youtubeMusicId: matched ? `yt_${track.spotifyTrackId}` : null,
        });

        if (matched) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (trackError) {
        transferItems.push({
          transferJobId: job.id,
          trackName: track.title,
          artistName: track.artists.join(", "),
          status: "FAILED",
          errorMessage: trackError.message,
        });
        failureCount++;
      }

      // Batch update: every N tracks or on last track
      const isLastTrack = i === tracks.length - 1;
      const shouldFlush =
        transferItems.length >= PROGRESS_UPDATE_BATCH_SIZE || isLastTrack;

      if (shouldFlush && transferItems.length > 0) {
        await prisma.$transaction([
          prisma.transferItem.createMany({ data: transferItems }),
          prisma.transferJob.update({
            where: { id: job.id },
            data: {
              processedTracks: i + 1,
              successCount,
              failureCount,
            },
          }),
        ]);
        transferItems.length = 0;
      }
    }

    // Determine final status
    const finalStatus =
      failureCount === 0
        ? "COMPLETED"
        : successCount === 0
          ? "FAILED"
          : "PARTIAL";

    await prisma.transferJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        completedAt: new Date(),
      },
    });

    return getJobById(job.id, userId);
  } catch (error) {
    // Critical failure - mark job as failed
    await prisma.transferJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: error.message,
      },
    });

    throw error;
  }
};

/**
 * Placeholder for YouTube Music track matching.
 * Replace with actual YouTube Music API integration.
 */
const simulateYouTubeMatch = async (track) => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return Math.random() > 0.1;
};
