/**
 * YouTube Auth command - Set up YouTube Music authentication
 * Simple line-by-line input, saves locally for reuse
 */
import chalk from "chalk";
import ora from "ora";
import open from "open";
import readline from "readline";

import {
  isLoggedIn,
  getYouTubeHeaders,
  setYouTubeHeaders,
  getYouTubePath,
  YouTubeHeaders,
} from "../utils/config.js";
import {
  saveYouTubeAuth,
  validateYouTubeAuth,
  getYouTubeAuthStatus,
} from "../utils/api.js";

async function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function saveAndValidateHeaders(headers: YouTubeHeaders): Promise<boolean> {
  const headersJson = JSON.stringify(headers);

  const saveSpinner = ora("Saving YouTube Music authentication...").start();

  try {
    await saveYouTubeAuth(headersJson);
    // Save locally too
    setYouTubeHeaders(headers);
    saveSpinner.succeed("Authentication saved");

    const validateSpinner = ora("Validating...").start();

    try {
      const validation = await validateYouTubeAuth();

      if (validation.valid) {
        validateSpinner.succeed(chalk.green("YouTube Music connected!"));
        console.log();
        console.log(chalk.dim(`  Saved to: ${getYouTubePath()}`));
        console.log();
        console.log(chalk.cyan("You're all set! Now run:"));
        console.log(chalk.white("  songjump transfer <spotify-playlist-url>\n"));
        return true;
      } else {
        validateSpinner.fail(chalk.red("Session expired or invalid headers"));
        console.log(chalk.yellow("\n  Please get fresh headers from YouTube Music.\n"));
        return false;
      }
    } catch {
      validateSpinner.warn(chalk.yellow("Saved (Python service offline - can't validate)"));
      return true;
    }
  } catch (error) {
    saveSpinner.fail(chalk.red("Failed to save"));
    console.error(chalk.red(`  ${error instanceof Error ? error.message : String(error)}\n`));
    return false;
  }
}

async function collectHeaders(): Promise<YouTubeHeaders | null> {
  console.log();
  console.log(chalk.yellow("  Opening YouTube Music...\n"));
  await open("https://music.youtube.com");

  console.log(chalk.bold("  How to get your headers:\n"));
  console.log(chalk.white("  1.") + " Make sure you're " + chalk.bold("logged in") + " to Google");
  console.log(chalk.white("  2.") + " Press " + chalk.bold("F12") + " to open DevTools");
  console.log(chalk.white("  3.") + " Go to " + chalk.bold("Network") + " tab");
  console.log(chalk.white("  4.") + " Filter by " + chalk.yellow("browse"));
  console.log(chalk.white("  5.") + " Click " + chalk.bold("Library") + " in YouTube Music");
  console.log(chalk.white("  6.") + " Click any request, find " + chalk.bold("Request Headers"));
  console.log();

  await askQuestion(chalk.dim("  Press Enter when ready..."));
  console.log();

  const authorization = await askQuestion(
    chalk.cyan("  Enter Authorization value ") + chalk.dim("(starts with SAPISIDHASH)") + chalk.cyan(":\n  > ")
  );

  if (!authorization) {
    console.log(chalk.red("\n  Authorization is required.\n"));
    return null;
  }

  console.log();
  const cookie = await askQuestion(
    chalk.cyan("  Enter Cookie value ") + chalk.dim("(full cookie string)") + chalk.cyan(":\n  > ")
  );

  if (!cookie) {
    console.log(chalk.red("\n  Cookie is required.\n"));
    return null;
  }

  console.log();
  const xOrigin = await askQuestion(
    chalk.cyan("  Enter X-Origin ") + chalk.dim("[https://music.youtube.com]") + chalk.cyan(":\n  > ")
  );

  return {
    Authorization: authorization,
    Cookie: cookie,
    "X-Origin": xOrigin || "https://music.youtube.com",
  };
}

export async function ytAuthCommand(): Promise<void> {
  if (!isLoggedIn()) {
    console.log(chalk.yellow("\nYou must be logged in first."));
    console.log(chalk.dim("Run 'songjump login' to authenticate.\n"));
    return;
  }

  console.log();
  console.log(chalk.cyan.bold("  YouTube Music Authentication\n"));

  // Check if we have saved headers
  const savedHeaders = getYouTubeHeaders();

  if (savedHeaders) {
    console.log(chalk.dim("  Found saved YouTube headers. Checking if still valid...\n"));

    const spinner = ora("Validating saved session...").start();

    try {
      // First sync to backend
      await saveYouTubeAuth(JSON.stringify(savedHeaders));
      const validation = await validateYouTubeAuth();

      if (validation.valid) {
        spinner.succeed(chalk.green("YouTube Music already connected!"));
        console.log();
        console.log(chalk.cyan("You're ready! Run:"));
        console.log(chalk.white("  songjump transfer <spotify-playlist-url>\n"));
        process.exit(0);
        return;
      } else {
        spinner.fail(chalk.yellow("Session expired"));
        console.log(chalk.dim("\n  Let's get fresh headers.\n"));
      }
    } catch {
      spinner.warn(chalk.yellow("Couldn't validate (service offline)"));
      console.log(chalk.dim("\n  Let's update your headers.\n"));
    }
  } else {
    // Check backend status
    const spinner = ora("Checking YouTube Music status...").start();
    try {
      const status = await getYouTubeAuthStatus();
      if (status.authenticated) {
        spinner.info("Connected on backend but no local cache");
      } else {
        spinner.info("YouTube Music not connected yet");
      }
    } catch {
      spinner.stop();
    }
  }

  // Collect headers
  const headers = await collectHeaders();

  if (!headers) {
    process.exit(1);
    return;
  }

  console.log();
  await saveAndValidateHeaders(headers);
  process.exit(0);
}
