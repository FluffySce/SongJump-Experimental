import { prisma } from "../../libs/prisma.js";
import * as spotifyDataService from "../spotify/spotify.data.service.js";

/**
 * State Machine Transitions:
 *
 * PENDING -> PROCESSING (on start)
 * PROCESSING -> COMPLETED (all tracks processed)
 * PROCESSING -> PARTIAL (some tracks failed)
 * PROCESSING -> FAILED (critical error during processing)
 *
 * Inavlid transitions -> REJECTED
 */

const VALID_TRANSITIONS = {
  PENDING: ["PROCESSING"],
  PROCESSING: ["COMPLETED", "PARTIAL", "FAILED"],
  COMPLETED: [],
  PARTIAL: ["PROCESSING"], //allow retry
  FAILED: ["PROCESSING"], //allow retry
};

/**
 * creates a new transfer job -> pending state
 * doesnt excute the transfer (separate operation)
 */

export const createTransferJob = async ({
  userId,
  spotifyPlaylistId,
  targetProvider = "google",
}) => {
  //validating target provider
  if (targetProvider !== "google") {
    throw new Error("only YTmusic (google) is supported for now.");
  }

  //create job in pending state
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
    throw new Error("Job not found");
  }
  if (job.userId !== userId) {
    throw new Error("Unauthorized access to job");
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
const transitionState = async (jobId, currentStatus, newStatus) => {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];

  if (!allowedTransitions?.includes(newStatus)) {
    throw new Error(
      `Invalid state transition: ${currentStatus} → ${newStatus}`,
    );
  }

  const updateData = { status: newStatus };

  if (newStatus === "COMPLETED" || newStatus === "PARTIAL") {
    updateData.completedAt = new Date();
  }

  return prisma.transferJob.update({
    where: { id: jobId },
    data: updateData,
  });
};

/**
 * Starts processing a transfer job.
 *
 * This is currently SYNCHRONOUS - it blocks until complete.
 * When we add BullMQ, this function will instead enqueue the job
 * and return immediately.
 */
export const startTransferJob = async (jobId, userId) => {
  // Fetch and validate job
  const job = await getJobById(jobId, userId);

  // Validate state transition
  if (
    job.status !== "PENDING" &&
    job.status !== "FAILED" &&
    job.status !== "PARTIAL"
  ) {
    throw new Error(`Cannot start job in ${job.status} state`);
  }

  // Transition to PROCESSING
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

    // Process each track
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];

      try {
        // Simulate YouTube Music search/match
        // In production, this would call youtube.data.service.js
        const matched = await simulateYouTubeMatch(track);

        // Create transfer item record
        await prisma.transferItem.create({
          data: {
            transferJobId: job.id,
            trackName: track.title,
            artistName: track.artists.join(", "),
            status: matched ? "FOUND" : "NOT_FOUND",
            youtubeMusicId: matched ? `yt_${track.spotifyTrackId}` : null,
          },
        });

        if (matched) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (trackError) {
        // Individual track failure shouldn't stop the job
        await prisma.transferItem.create({
          data: {
            transferJobId: job.id,
            trackName: track.title,
            artistName: track.artists.join(", "),
            status: "FAILED",
            errorMessage: trackError.message,
          },
        });
        failureCount++;
      }

      // Update progress after each track
      await prisma.transferJob.update({
        where: { id: job.id },
        data: {
          processedTracks: i + 1,
          successCount,
          failureCount,
        },
      });
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
 * Simulates YouTube Music track matching.
 *
 * In production, this would:
 * 1. Search YouTube Music API by ISRC (most accurate)
 * 2. Fall back to search by title + artist
 * 3. Return the best match or null
 *
 * For now, we simulate with 90% success rate.
 */
const simulateYouTubeMatch = async (track) => {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 50));

  // 90% success rate simulation
  return Math.random() > 0.1;
};
