/**
 * Transfer command - Transfer Spotify playlist to YouTube Music
 * With progress feedback and success summary
 */
import chalk from "chalk";
import ora from "ora";
import open from "open";

import { isLoggedIn } from "../utils/config.js";
import { quickTransfer, TransferResult } from "../utils/api.js";

function extractPlaylistId(urlOrId: string): string {
  // Handle full URLs like https://open.spotify.com/playlist/xxx?si=yyy
  const urlMatch = urlOrId.match(/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  // Assume it's already an ID
  return urlOrId;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export async function transferCommand(
  playlistUrl: string,
  options: { open?: boolean },
): Promise<void> {
  if (!isLoggedIn()) {
    console.log(chalk.yellow("\nYou must be logged in first."));
    console.log(chalk.dim("Run 'songjump login' to authenticate.\n"));
    process.exit(1);
  }

  const playlistId = extractPlaylistId(playlistUrl);
  console.log();

  const startTime = Date.now();

  // Step 1: Fetching playlist
  const fetchSpinner = ora("Fetching Spotify playlist...").start();

  let result: TransferResult;

  try {
    // We make a single API call but show staged progress
    // The stages are simulated based on typical transfer flow

    // Start the transfer (this does everything server-side)
    const transferPromise = quickTransfer(playlistId);

    // Simulate progress stages with timeouts
    await new Promise((resolve) => setTimeout(resolve, 800));
    fetchSpinner.succeed("Fetched Spotify playlist");

    const matchSpinner = ora("Matching tracks on YouTube Music...").start();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    matchSpinner.text = "Matching tracks on YouTube Music...";

    // Wait for actual result
    result = await transferPromise;

    if (!result.success) {
      matchSpinner.fail(chalk.red("Transfer failed"));
      console.log(chalk.red(`\n  ${result.error || "Unknown error"}\n`));
      process.exit(1);
    }

    matchSpinner.succeed(`Found ${result.totalTracks} tracks`);

    const createSpinner = ora("Creating playlist on YouTube Music...").start();
    await new Promise((resolve) => setTimeout(resolve, 500));
    createSpinner.succeed(
      `Created playlist: ${chalk.cyan(result.playlistName)}`,
    );

    const addSpinner = ora("Adding tracks...").start();
    await new Promise((resolve) => setTimeout(resolve, 300));
    addSpinner.succeed(`Added ${result.successCount} tracks`);
  } catch (error) {
    fetchSpinner.fail(chalk.red("Transfer failed"));
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`\n  ${message}\n`));
    process.exit(1);
  }

  const duration = Date.now() - startTime;

  // Summary
  console.log();
  console.log(chalk.bold("  Transfer Complete!\n"));

  const successRate =
    result.totalTracks! > 0
      ? ((result.successCount! / result.totalTracks!) * 100).toFixed(1)
      : "0";

  console.log(chalk.dim("  ──────────────────────────────────"));
  console.log(`  Playlist:      ${chalk.cyan(result.playlistName)}`);
  console.log(`  Total tracks:  ${result.totalTracks}`);
  console.log(`  Transferred:   ${chalk.green(result.successCount)}`);
  if (result.failureCount && result.failureCount > 0) {
    console.log(`  Failed:        ${chalk.red(result.failureCount)}`);
  }
  console.log(`  Success rate:  ${chalk.green(successRate + "%")}`);
  console.log(`  Duration:      ${formatDuration(duration)}`);
  console.log(chalk.dim("  ──────────────────────────────────"));

  // Show failed tracks if any
  if (result.failureCount && result.failureCount > 0 && result.tracks) {
    const failed = result.tracks.filter((t) => t.status !== "matched");
    if (failed.length > 0) {
      console.log();
      console.log(chalk.yellow("  Failed to match:"));
      failed.slice(0, 5).forEach((t) => {
        console.log(chalk.dim(`    - ${t.name} by ${t.artist}`));
      });
      if (failed.length > 5) {
        console.log(chalk.dim(`    ... and ${failed.length - 5} more`));
      }
    }
  }

  console.log();

  // Open playlist if requested
  if (options.open) {
    console.log(chalk.dim("  Opening playlist in browser..."));
    await open("https://music.youtube.com/library/playlists");
    console.log();
  }

  process.exit(0);
}
