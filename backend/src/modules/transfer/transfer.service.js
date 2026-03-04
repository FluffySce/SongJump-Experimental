//transfer.service.js
import { prisma } from "../../libs/prisma.js";
import * as spotifyDataService from "../spotify/spotify.data.service.js";
import * as youtubeService from "../youtube/youtube.service.js";
import { env } from "../../config/env.js";

// Python microservice URL
const YTMUSIC_SERVICE_URL = env.ytmusicServiceUrl;

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
 * Calls Python microservice to create playlist and add tracks on YouTube Music.
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

  // Get YouTube Music auth headers
  const ytAuthHeaders = await youtubeService.getAuthHeaders(userId);
  if (!ytAuthHeaders) {
    throw new ValidationError(
      "YouTube Music authentication required. Please connect your YouTube Music account first.",
    );
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

    // Fetch playlist info for the name
    const playlistInfo = await spotifyDataService.getPlaylistInfo(
      userId,
      job.sourcePlaylistId,
    );

    const playlistName =
      playlistInfo?.name ||
      `Transferred Playlist ${new Date().toLocaleDateString()}`;

    // Update job with playlist name and total tracks
    await prisma.transferJob.update({
      where: { id: job.id },
      data: {
        totalTracks: tracks.length,
        sourcePlaylistName: playlistName,
      },
    });

    // Prepare tracks for Python service
    const tracksPayload = tracks.map((track) => ({
      spotifyTrackId: track.spotifyTrackId,
      title: track.title,
      artists: track.artists.join(", "),
      album: track.album || null,
      isrc: track.isrc || null,
    }));

    // Call Python microservice
    const transferResult = await callYTMusicService({
      authHeaders: ytAuthHeaders,
      playlistName,
      playlistDescription: `Transferred from Spotify - ${playlistName}`,
      tracks: tracksPayload,
    });

    // Map results to TransferItems
    const transferItems = transferResult.results.map((result) => ({
      transferJobId: job.id,
      trackName: result.title,
      artistName: result.artist,
      status: result.status, // FOUND, NOT_FOUND, FAILED
      youtubeMusicId: result.ytVideoId || null,
      errorMessage: result.error || null,
    }));

    // Store all transfer items
    await prisma.transferItem.createMany({ data: transferItems });

    // Determine final status
    const successCount = transferResult.successCount;
    const failureCount = transferResult.failureCount;
    const finalStatus =
      failureCount === 0
        ? "COMPLETED"
        : successCount === 0
          ? "FAILED"
          : "PARTIAL";

    // Update job with final results
    await prisma.transferJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        processedTracks: tracks.length,
        successCount,
        failureCount,
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
 * Call the Python YTMusic microservice to transfer playlist.
 */
const callYTMusicService = async ({
  authHeaders,
  playlistName,
  playlistDescription,
  tracks,
}) => {
  const response = await fetch(`${YTMUSIC_SERVICE_URL}/transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      authHeaders,
      playlistName,
      playlistDescription,
      tracks,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData.detail || `YTMusic service error: ${response.status}`;

    if (response.status === 401) {
      throw new UnauthorizedError(
        "YouTube Music authentication failed. Please re-authenticate.",
      );
    }

    throw new TransferError(errorMessage, response.status);
  }

  return response.json();
};
